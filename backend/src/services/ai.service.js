// Servicio de IA — Groq con fallback a HuggingFace
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

const GROQ_KEY = process.env.GROQ_API_KEY || '';
const HF_KEY = process.env.HUGGINGFACE_API_KEY || '';
const SERPER_KEY = process.env.SERPER_API_KEY || '';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const HF_MODEL = 'Qwen/Qwen2.5-7B-Instruct';

console.log('[AI] GROQ_API_KEY presente:', !!GROQ_KEY, GROQ_KEY ? `(${GROQ_KEY.substring(0, 8)}...)` : '');
console.log('[AI] HUGGINGFACE_API_KEY presente:', !!HF_KEY);

if (!GROQ_KEY && !HF_KEY) {
    console.warn('[AI] Ni GROQ_API_KEY ni HUGGINGFACE_API_KEY configuradas. IA no disponible.');
} else {
    if (GROQ_KEY) console.log('[AI] Groq configurado con modelo:', GROQ_MODEL);
    if (HF_KEY) console.log('[AI] HuggingFace configurado como fallback con modelo:', HF_MODEL);
}
if (SERPER_KEY) console.log('[AI] Serper.dev configurado para imagenes de productos');
else console.warn('[AI] SERPER_API_KEY no configurada — sin imagenes de producto. Consigue una gratis en serper.dev');

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

// ── Helper: acortar errores para el usuario ─────────────────────────────────
const shortenError = (msg) => {
    if (!msg) return '';
    const s = typeof msg === 'string' ? msg : JSON.stringify(msg);
    if (s.includes('429')) return 'cuota agotada (espera unos minutos)';
    if (s.includes('401') || s.includes('403')) return 'API key invalida';
    if (s.includes('404')) return 'modelo no encontrado';
    if (s.includes('503')) return 'modelo cargando, reintenta';
    if (s.length > 80) return s.substring(0, 80) + '...';
    return s;
};

// ── Groq Inference API (OpenAI-compatible) ──────────────────────────────────

const groqGenerate = async (messages, maxTokens = 512) => {
    const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
            model: GROQ_MODEL,
            messages,
            max_tokens: maxTokens,
            temperature: 0.7,
        },
        {
            headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
            timeout: 30000,
        }
    );
    return (response.data?.choices?.[0]?.message?.content || '').trim();
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
        if (err.response?.status === 503) {
            const wait = Math.min((err.response?.data?.estimated_time || 10) * 1000, 30000);
            console.log(`[AI] HuggingFace modelo cargando, reintentando en ${Math.round(wait / 1000)}s...`);
            await new Promise((r) => setTimeout(r, wait));
            return await makeRequest();
        }
        throw err;
    }
};

// ── Recomendar outfit por clima ─────────────────────────────────────────────

const recommendByWeather = async ({ weather, garments = [], outfits = [] }) => {
    if (!GROQ_KEY && !HF_KEY) return { outfitName: null, reason: 'Configura GROQ_API_KEY o HUGGINGFACE_API_KEY en el archivo .env del backend.' };

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

    // Try Groq first
    let groqError = '';
    if (GROQ_KEY) {
        try {
            const text = await groqGenerate([{ role: 'user', content: prompt }]);
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const jsonMatch = clean.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (err) {
            groqError = err.response?.data?.error?.message || err.message;
            console.error('[AI] Groq recommendByWeather fallo:', groqError);
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
            console.error('[AI] HuggingFace recommendByWeather fallo:', hfError);
        }
    }

    const details = [groqError && `Groq: ${shortenError(groqError)}`, hfError && `HuggingFace: ${shortenError(hfError)}`].filter(Boolean).join(' | ');
    return { outfitName: null, reason: details || 'No se pudo obtener una recomendacion. Verifica las API keys.' };
};

// ── Chat sobre armario ───────────────────────────────────────────────────────

const chatAboutWardrobe = async ({ messages = [], garments = [], outfits = [], weather = null }) => {
    if (!GROQ_KEY && !HF_KEY) return 'Configura GROQ_API_KEY o HUGGINGFACE_API_KEY en el archivo .env del backend para usar el chat de IA.';

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

    // Try Groq first
    let groqError = '';
    if (GROQ_KEY) {
        try {
            const chatMessages = [
                { role: 'system', content: systemContext },
                ...validMessages.map((m) => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: m.content,
                })),
            ];
            const reply = await groqGenerate(chatMessages, 400);
            return reply || 'Lo siento, no pude generar una respuesta.';
        } catch (err) {
            groqError = err.response?.data?.error?.message || err.message;
            console.error('[AI] Groq chat fallo:', groqError);
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
            console.error('[AI] HuggingFace chat fallo:', hfError);
        }
    }

    const details = [groqError && `Groq: ${shortenError(groqError)}`, hfError && `HuggingFace: ${shortenError(hfError)}`].filter(Boolean).join(' | ');
    return `Error de IA: ${details || 'Verifica las API keys en .env y reinicia el backend.'}`;
};

// ── Serper.dev: buscar imagen real de producto via Google Images ──────────────
const fetchProductImage = async (query) => {
    if (!SERPER_KEY) return null;
    try {
        const res = await axios.post(
            'https://google.serper.dev/images',
            { q: `${query} ropa comprar`, num: 3 },
            {
                headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
                timeout: 5000,
            }
        );
        const images = res.data?.images || [];
        const img = images.find((i) => i.imageUrl && !i.imageUrl.includes('x-raw-image'));
        return img?.imageUrl || images[0]?.imageUrl || null;
    } catch (err) {
        console.warn('[AI] Serper image search failed:', err.message);
        return null;
    }
};

// ── Enriquecer recomendaciones con imagenes reales y searchUrl ────────────────
const enrichWithImages = async (items) => {
    const enriched = await Promise.all(
        items.map(async (item) => {
            const imageUrl = await fetchProductImage(item.name);
            return {
                ...item,
                imageUrl: imageUrl || null,
                searchUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.name)}`,
            };
        })
    );
    return enriched;
};

// ── Recomendar prendas para comprar ──────────────────────────────────────────

const recommendPurchases = async ({ garments = [], query = '', gender = '' }) => {
    if (!GROQ_KEY && !HF_KEY) {
        return [{ name: 'Sin API key', description: 'Configura GROQ_API_KEY o HUGGINGFACE_API_KEY en el .env del backend', reason: '', category: 'info', searchUrl: '' }];
    }

    const categories = {};
    garments.forEach((g) => {
        const cat = g.category || 'otro';
        categories[cat] = (categories[cat] || 0) + 1;
    });
    const wardrobeSummary = Object.entries(categories)
        .map(([cat, count]) => `${cat}: ${count} prenda(s)`)
        .join(', ');

    const genderHint = gender === 'hombre'
        ? ' El usuario es HOMBRE. Recomienda SOLO ropa de hombre (nada de vestidos, faldas ni ropa femenina).'
        : gender === 'mujer'
            ? ' La usuaria es MUJER. Recomienda ropa de mujer.'
            : '';

    const userContext = query
        ? `El usuario busca: "${query}". Teniendo en cuenta su armario (${wardrobeSummary || 'vacio'}), recomienda 10 articulos de moda concretos relacionados con lo que pide (nombre de producto real con marca si es posible). Si busca accesorios (reloj, gafas, pulsera, collar, anillo, cinturon, gorra, bufanda, bolso, mochila, cartera, etc.) recomienda SOLO accesorios de ese tipo, variando marcas y estilos. Incluye un precio estimado en euros.`
        : wardrobeSummary
            ? `El usuario tiene: ${wardrobeSummary}. Recomienda 10 articulos de moda concretos para comprar que complementen su armario (prendas, calzado y accesorios — nombre de producto real con marca si es posible). Incluye un precio estimado en euros.`
            : `El usuario no tiene ropa. Recomienda 10 articulos basicos esenciales (prendas, calzado y accesorios — nombres concretos con marca). Incluye un precio estimado en euros.`;

    const prompt = `Eres un estilista personal experto en moda.${genderHint} ${userContext} Responde SOLO con JSON, sin texto extra. Formato: [{"name":"Pantalon chino Zara beige","description":"Versatil para combinar","reason":"Te falta un pantalon neutro","category":"pantalones","estimatedPrice":"29.99"}]. Las categorias validas incluyen: camisetas, pantalones, zapatos, chaquetas, sudaderas, vestidos, accesorios, relojes, gafas, bolsos, y cualquier otra prenda de moda.`;

    // Try Groq first
    let groqError = '';
    if (GROQ_KEY) {
        try {
            const text = await groqGenerate([{ role: 'user', content: prompt }], 1500);
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const arrayMatch = clean.match(/\[[\s\S]*?\]/);
            if (arrayMatch) {
                const parsed = JSON.parse(arrayMatch[0]);
                if (Array.isArray(parsed)) return await enrichWithImages(parsed.slice(0, 10));
            }
            const parsed = JSON.parse(clean);
            if (Array.isArray(parsed)) return await enrichWithImages(parsed.slice(0, 10));
        } catch (err) {
            groqError = err.response?.data?.error?.message || err.message;
            console.error('[AI] Groq shopping fallo:', groqError);
        }
    }

    // Fallback to HuggingFace
    let hfError = '';
    if (HF_KEY) {
        try {
            const text = await hfGenerate(prompt, 1500);
            console.log('[AI] HuggingFace shopping raw:', text.substring(0, 300));
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            const arrayMatch = clean.match(/\[[\s\S]*?\]/);
            if (arrayMatch) {
                try {
                    const parsed = JSON.parse(arrayMatch[0]);
                    if (Array.isArray(parsed) && parsed.length > 0) return await enrichWithImages(parsed.slice(0, 10));
                } catch (_) { /* try next */ }
            }

            try {
                const parsed = JSON.parse(clean);
                if (Array.isArray(parsed)) return await enrichWithImages(parsed.slice(0, 10));
            } catch (_) { /* try next */ }

            const objects = [];
            const objRegex = /\{[^{}]*"name"\s*:\s*"[^"]+?"[^{}]*\}/g;
            let m;
            while ((m = objRegex.exec(clean)) !== null) {
                try { objects.push(JSON.parse(m[0])); } catch (_) { /* skip */ }
            }
            if (objects.length > 0) return await enrichWithImages(objects.slice(0, 10));

            hfError = 'Respuesta no tiene formato JSON valido';
        } catch (err) {
            hfError = err.response?.data?.error || err.message;
            console.error('[AI] HuggingFace shopping fallo:', hfError);
        }
    }

    const details = [groqError && `Groq: ${shortenError(groqError)}`, hfError && `HuggingFace: ${shortenError(hfError)}`].filter(Boolean).join(' | ');
    return [{ name: 'Error', description: details || 'No se pudieron obtener recomendaciones.', reason: 'Verifica las API keys', category: 'error', searchUrl: '' }];
};

module.exports = { recommendByWeather, chatAboutWardrobe, recommendPurchases };
