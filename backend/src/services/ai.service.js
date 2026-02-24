// Servicio de IA — Gemini con fallback a HuggingFace
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const HF_KEY = process.env.HUGGINGFACE_API_KEY || '';
const MODEL_NAME = 'gemini-2.0-flash';
const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';

if (!GEMINI_KEY && !HF_KEY) {
    console.warn('[AI] Ni GEMINI_API_KEY ni HUGGINGFACE_API_KEY configuradas. IA no disponible.');
} else {
    if (GEMINI_KEY) console.log('[AI] Gemini configurado con modelo:', MODEL_NAME);
    if (HF_KEY) console.log('[AI] HuggingFace configurado como fallback con modelo:', HF_MODEL);
}

// ── Helpers de contexto ──────────────────────────────────────────────────────

const buildWardrobeContext = (garments = [], outfits = []) => {
    const gStr = garments.length
        ? garments
              .map(
                  (g) =>
                      `- ${g.name} (categoria: ${g.category || '?'}, color: ${g.color || '?'}, temporada: ${g.season || 'todas'}, ocasion: ${g.occasion || 'casual'})`
              )
              .join('\n')
        : 'Sin prendas aun.';

    const oStr = outfits.length
        ? outfits
              .map((o) => {
                  const items = Array.isArray(o.garments) ? o.garments.map((g) => g.name).join(', ') : '';
                  return `- "${o.name}" (ocasion: ${o.occasion || '?'}, temporada: ${o.season || '?'}${items ? `, prendas: ${items}` : ''})`;
              })
              .join('\n')
        : 'Sin outfits creados aun.';

    return { gStr, oStr };
};

const getModel = () => {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    return genAI.getGenerativeModel({ model: MODEL_NAME });
};

// ── Helper: acortar errores para el usuario ─────────────────────────────────
const shortenError = (msg) => {
    if (!msg) return '';
    if (msg.includes('429')) return 'cuota agotada (espera unos minutos)';
    if (msg.includes('401') || msg.includes('403')) return 'API key invalida';
    if (msg.includes('404')) return 'modelo no encontrado';
    if (msg.includes('503')) return 'modelo cargando, reintenta';
    if (msg.length > 80) return msg.substring(0, 80) + '...';
    return msg;
};

// ── HuggingFace Inference API (OpenAI-compatible) ────────────────────────────

const hfGenerate = async (prompt, maxTokens = 512) => {
    const makeRequest = async () => {
        const response = await axios.post(
            'https://router.huggingface.co/v1/chat/completions',
            {
                model: HF_MODEL,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: maxTokens,
                temperature: 0.7,
            },
            {
                headers: { Authorization: `Bearer ${HF_KEY}`, 'Content-Type': 'application/json' },
                timeout: 60000,
            }
        );
        return (response.data?.choices?.[0]?.message?.content || '').trim();
    };

    try {
        return await makeRequest();
    } catch (err) {
        // Retry once on 503 (model loading)
        if (err.response?.status === 503) {
            const wait = Math.min((err.response?.data?.estimated_time || 10) * 1000, 30000);
            console.log(`[AI] HuggingFace modelo cargando, reintentando en ${Math.round(wait / 1000)}s...`);
            await new Promise((r) => setTimeout(r, wait));
            return await makeRequest();
        }
        throw err;
    }
};

// ── Gemini: recomendar outfit por clima ─────────────────────────────────────

const recommendByWeather = async ({ weather, garments = [], outfits = [] }) => {
    if (!GEMINI_KEY && !HF_KEY) return { outfitName: null, reason: 'Configura GEMINI_API_KEY o HUGGINGFACE_API_KEY en el archivo .env del backend.' };

    const { gStr, oStr } = buildWardrobeContext(garments, outfits);
    const prompt = `Eres un asistente de moda personal. El usuario tiene el siguiente armario:

PRENDAS:
${gStr}

OUTFITS GUARDADOS:
${oStr}

CLIMA ACTUAL: ${weather.temp}°C, ${weather.description}, en ${weather.city || 'su ciudad'}.

Basandote en el clima actual, recomienda el outfit guardado mas adecuado (o una combinacion de prendas si no hay outfits).
Responde en este formato JSON exacto sin markdown:
{
  "outfitName": "nombre del outfit o combinacion",
  "reason": "explicacion breve de por que es ideal para este clima (max 2 frases)"
}`;

    // Try Gemini first
    let geminiError = '';
    if (GEMINI_KEY) {
        try {
            const model = getModel();
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(clean);
        } catch (err) {
            geminiError = err.message;
            console.error('[AI] Gemini recommendByWeather falló:', err.message);
        }
    }

    // Fallback to HuggingFace
    let hfError = '';
    if (HF_KEY) {
        try {
            const text = await hfGenerate(prompt);
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const jsonMatch = clean.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (err) {
            hfError = err.response?.data?.error || err.message;
            console.error('[AI] HuggingFace recommendByWeather falló:', hfError);
        }
    }

    const details = [geminiError && `Gemini: ${shortenError(geminiError)}`, hfError && `HuggingFace: ${shortenError(hfError)}`].filter(Boolean).join(' | ');
    return { outfitName: null, reason: details || 'No se pudo obtener una recomendacion. Verifica las API keys.' };
};

// ── Gemini: chat sobre armario ───────────────────────────────────────────────

const chatAboutWardrobe = async ({ messages = [], garments = [], outfits = [], weather = null }) => {
    if (!GEMINI_KEY && !HF_KEY) return 'Configura GEMINI_API_KEY o HUGGINGFACE_API_KEY en el archivo .env del backend para usar el chat de IA.';

    const { gStr, oStr } = buildWardrobeContext(garments, outfits);
    const weatherCtx = weather
        ? `\nCLIMA ACTUAL: ${weather.temp}°C, ${weather.description} en ${weather.city || 'su ciudad'}.`
        : '';

    const systemContext = `Eres StyleAI, asistente de moda personal. Tienes acceso al armario del usuario.

PRENDAS:
${gStr}

OUTFITS:
${oStr}${weatherCtx}

REGLAS:
- Responde en espanol, conciso (2-3 frases max).
- Si el usuario pregunta que ponerse para un evento y TIENE prendas adecuadas, recomienda de su armario.
- Si NO tiene prendas adecuadas para el evento, preguntale: "No tienes prendas ideales para eso. Quieres que te sugiera que comprar?"
- Solo sugiere compras si el usuario dice que si. Cuando lo hagas, da nombres concretos de productos (marca, modelo, color) que pueda buscar en tiendas.
- No uses emojis.
- No repitas el armario completo en cada respuesta.`;

    const validMessages = messages.filter((m) => m && m.content && m.content.trim());
    const lastMsg = validMessages[validMessages.length - 1];
    if (!lastMsg || !lastMsg.content) {
        return 'No se recibio ningun mensaje. Escribe algo para empezar.';
    }

    // Try Gemini first
    let geminiError = '';
    if (GEMINI_KEY) {
        try {
            const model = getModel();
            const history = validMessages.slice(0, -1).map((m) => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }],
            }));

            const cleanHistory = [];
            for (const h of history) {
                if (cleanHistory.length === 0 && h.role !== 'user') continue;
                if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === h.role) continue;
                cleanHistory.push(h);
            }

            const chat = model.startChat({
                history: cleanHistory,
                systemInstruction: { parts: [{ text: systemContext }] },
            });

            const result = await chat.sendMessage(lastMsg.content);
            return result.response.text();
        } catch (err) {
            geminiError = err.message;
            console.error('[AI] Gemini chat falló:', err.message);
        }
    }

    // Fallback to HuggingFace
    let hfError = '';
    if (HF_KEY) {
        try {
            const conversationContext = validMessages
                .slice(-5)
                .map((m) => `${m.role === 'user' ? 'Usuario' : 'StyleAI'}: ${m.content}`)
                .join('\n');
            const fullPrompt = `${systemContext}\n\nConversacion:\n${conversationContext}\n\nStyleAI:`;
            const reply = await hfGenerate(fullPrompt, 300);
            return reply || 'Lo siento, no pude generar una respuesta.';
        } catch (err) {
            hfError = err.response?.data?.error || err.message;
            console.error('[AI] HuggingFace chat falló:', hfError);
        }
    }

    const details = [geminiError && `Gemini: ${shortenError(geminiError)}`, hfError && `HuggingFace: ${shortenError(hfError)}`].filter(Boolean).join(' | ');
    return `Error de IA: ${details || 'Verifica las API keys en .env y reinicia el backend.'}`;
};

// ── Gemini: recomendar prendas para comprar ──────────────────────────────────

const recommendPurchases = async ({ garments = [] }) => {
    if (!GEMINI_KEY && !HF_KEY) {
        return [{ name: 'Sin API key', description: 'Configura GEMINI_API_KEY o HUGGINGFACE_API_KEY en el .env del backend', reason: '', category: 'info' }];
    }

    const categories = {};
    garments.forEach((g) => {
        const cat = g.category || 'otro';
        categories[cat] = (categories[cat] || 0) + 1;
    });
    const wardrobeSummary = Object.entries(categories)
        .map(([cat, count]) => `${cat}: ${count} prenda(s)`)
        .join(', ');

    const prompt = wardrobeSummary
        ? `Eres un estilista. El usuario tiene: ${wardrobeSummary}. Recomienda 5 prendas concretas para comprar (nombre de producto real con marca si es posible). Responde SOLO con JSON, sin texto extra. Formato: [{"name":"Pantalon chino Zara beige","description":"Versatil para combinar","reason":"Te falta un pantalon neutro","category":"pantalones"}]`
        : `Eres un estilista. El usuario no tiene ropa. Recomienda 5 prendas basicas esenciales (nombres concretos con marca). Responde SOLO con JSON, sin texto extra. Formato: [{"name":"Camiseta basica blanca Uniqlo","description":"Esencial para cualquier armario","reason":"Base de todo outfit","category":"camisetas"}]`;

    // Try Gemini first
    let geminiError = '';
    if (GEMINI_KEY) {
        try {
            const model = getModel();
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(clean);
            return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
        } catch (err) {
            geminiError = err.message;
            console.error('[AI] Gemini shopping falló:', err.message);
        }
    }

    // Fallback to HuggingFace
    let hfError = '';
    if (HF_KEY) {
        try {
            const text = await hfGenerate(prompt, 800);
            console.log('[AI] HuggingFace shopping raw:', text.substring(0, 200));
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const arrayMatch = clean.match(/\[[\s\S]*?\]/);
            if (arrayMatch) {
                const parsed = JSON.parse(arrayMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 5);
            }
            // If no JSON array found, try to parse the whole response
            try {
                const parsed = JSON.parse(clean);
                if (Array.isArray(parsed)) return parsed.slice(0, 5);
            } catch (_) { /* ignore */ }
            hfError = 'Respuesta no tiene formato JSON valido';
        } catch (err) {
            hfError = err.response?.data?.error || err.message;
            console.error('[AI] HuggingFace shopping falló:', hfError);
        }
    }

    const details = [geminiError && `Gemini: ${shortenError(geminiError)}`, hfError && `HuggingFace: ${shortenError(hfError)}`].filter(Boolean).join(' | ');
    return [{ name: 'Error', description: details || 'No se pudieron obtener recomendaciones.', reason: 'Verifica las API keys', category: 'error' }];
};

module.exports = { recommendByWeather, chatAboutWardrobe, recommendPurchases };
