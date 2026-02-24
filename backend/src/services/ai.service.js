// Servicio de IA — Gemini con fallback a HuggingFace
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const HF_KEY = process.env.HUGGINGFACE_API_KEY || '';
const MODEL_NAME = 'gemini-2.0-flash';
const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.3';

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

// ── HuggingFace Inference API helper ─────────────────────────────────────────

const hfGenerate = async (prompt, maxTokens = 512) => {
    const response = await axios.post(
        `https://api-inference.huggingface.co/models/${HF_MODEL}`,
        {
            inputs: `<s>[INST] ${prompt} [/INST]`,
            parameters: { max_new_tokens: maxTokens, temperature: 0.7, return_full_text: false },
        },
        {
            headers: { Authorization: `Bearer ${HF_KEY}`, 'Content-Type': 'application/json' },
            timeout: 30000,
        }
    );
    const generated = response.data?.[0]?.generated_text || '';
    return generated.trim();
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
    if (GEMINI_KEY) {
        try {
            const model = getModel();
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(clean);
        } catch (err) {
            console.error('[AI] Gemini recommendByWeather falló:', err.message);
        }
    }

    // Fallback to HuggingFace
    if (HF_KEY) {
        try {
            const text = await hfGenerate(prompt);
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const jsonMatch = clean.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (err) {
            console.error('[AI] HuggingFace recommendByWeather falló:', err.message);
        }
    }

    return { outfitName: null, reason: 'No se pudo obtener una recomendacion en este momento.' };
};

// ── Gemini: chat sobre armario ───────────────────────────────────────────────

const chatAboutWardrobe = async ({ messages = [], garments = [], outfits = [], weather = null }) => {
    if (!GEMINI_KEY && !HF_KEY) return 'Configura GEMINI_API_KEY o HUGGINGFACE_API_KEY en el archivo .env del backend para usar el chat de IA.';

    const { gStr, oStr } = buildWardrobeContext(garments, outfits);
    const weatherCtx = weather
        ? `\nCLIMA ACTUAL: ${weather.temp}°C, ${weather.description} en ${weather.city || 'su ciudad'}.`
        : '';

    const systemContext = `Eres un asistente de moda personal llamado StyleAI. Tienes acceso al armario completo del usuario.

PRENDAS DEL USUARIO:
${gStr}

OUTFITS DEL USUARIO:
${oStr}${weatherCtx}

Responde siempre en espanol, de forma amigable y util. Si el usuario pregunta que ponerse para un evento, sugiere outfits guardados o combinaciones de sus prendas. Se conciso (max 3-4 frases).`;

    const validMessages = messages.filter((m) => m && m.content && m.content.trim());
    const lastMsg = validMessages[validMessages.length - 1];
    if (!lastMsg || !lastMsg.content) {
        return 'No se recibio ningun mensaje. Escribe algo para empezar.';
    }

    // Try Gemini first
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
                systemInstruction: systemContext,
            });

            const result = await chat.sendMessage(lastMsg.content);
            return result.response.text();
        } catch (err) {
            console.error('[AI] Gemini chat falló:', err.message);
        }
    }

    // Fallback to HuggingFace
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
            console.error('[AI] HuggingFace chat falló:', err.message);
        }
    }

    return 'Lo siento, hubo un error al procesar tu pregunta. Verifica la configuracion de las API keys.';
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
        ? `Actua como un estilista personal. El usuario tiene este armario: ${wardrobeSummary}. Recomienda 5 prendas concretas que deberia comprar para completar outfits versatiles y variados. Responde UNICAMENTE con JSON puro (sin markdown, sin explicaciones), en este formato exacto: [{"name":"...","description":"...","reason":"...","category":"..."}]`
        : `Actua como un estilista personal. El usuario tiene un armario vacio. Recomienda 5 prendas basicas esenciales para empezar un armario capsula. Responde UNICAMENTE con JSON puro (sin markdown, sin explicaciones), en este formato exacto: [{"name":"...","description":"...","reason":"...","category":"..."}]`;

    // Try Gemini first
    if (GEMINI_KEY) {
        try {
            const model = getModel();
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(clean);
            return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
        } catch (err) {
            console.error('[AI] Gemini shopping falló:', err.message);
        }
    }

    // Fallback to HuggingFace
    if (HF_KEY) {
        try {
            const text = await hfGenerate(prompt, 600);
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const arrayMatch = clean.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                const parsed = JSON.parse(arrayMatch[0]);
                return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
            }
        } catch (err) {
            console.error('[AI] HuggingFace shopping falló:', err.message);
        }
    }

    return [{ name: 'Error', description: 'No se pudieron obtener recomendaciones.', reason: 'Ambos proveedores fallaron', category: 'error' }];
};

module.exports = { recommendByWeather, chatAboutWardrobe, recommendPurchases };
