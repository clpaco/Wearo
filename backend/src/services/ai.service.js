// Servicio de IA — Gemini para todo (outfits, chat, compras)
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const MODEL_NAME = 'gemini-2.0-flash';

if (!GEMINI_KEY) {
    console.warn('[AI] GEMINI_API_KEY no configurada. Las funciones de IA no estarán disponibles.');
} else {
    console.log('[AI] Gemini configurado con modelo:', MODEL_NAME);
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

// ── Gemini: recomendar outfit por clima ─────────────────────────────────────

const recommendByWeather = async ({ weather, garments = [], outfits = [] }) => {
    if (!GEMINI_KEY) return { outfitName: null, reason: 'Configura GEMINI_API_KEY en el archivo .env del backend.' };

    try {
        const model = getModel();
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

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(clean);
    } catch (err) {
        console.error('[AI] Error recommendByWeather:', err.message);
        return { outfitName: null, reason: 'No se pudo obtener una recomendacion en este momento.' };
    }
};

// ── Gemini: chat sobre armario ───────────────────────────────────────────────

const chatAboutWardrobe = async ({ messages = [], garments = [], outfits = [], weather = null }) => {
    if (!GEMINI_KEY) return 'Configura GEMINI_API_KEY en el archivo .env del backend para usar el chat de IA.';

    try {
        const model = getModel();
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

        // Construir historial de chat (Gemini usa 'user' y 'model')
        // Filtrar mensajes vacios y asegurar alternancia correcta
        const validMessages = messages.filter((m) => m && m.content && m.content.trim());
        const history = validMessages.slice(0, -1).map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
        }));

        // Asegurar que el historial empieza con 'user' si hay mensajes
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

        const lastMsg = validMessages[validMessages.length - 1];
        if (!lastMsg || !lastMsg.content) {
            return 'No se recibio ningun mensaje. Escribe algo para empezar.';
        }

        const result = await chat.sendMessage(lastMsg.content);
        return result.response.text();
    } catch (err) {
        console.error('[AI] Error chat:', err.message, err.stack?.split('\n').slice(0, 3).join('\n'));
        if (err.message?.includes('API_KEY')) {
            return 'Error de autenticacion con Gemini. Verifica que GEMINI_API_KEY es valida.';
        }
        if (err.message?.includes('quota') || err.message?.includes('429')) {
            return 'Se alcanzo el limite de uso de la API. Intentalo de nuevo en unos minutos.';
        }
        return 'Lo siento, hubo un error al procesar tu pregunta. Intentalo de nuevo.';
    }
};

// ── Gemini: recomendar prendas para comprar ──────────────────────────────────

const recommendPurchases = async ({ garments = [] }) => {
    if (!GEMINI_KEY) {
        return [{ name: 'Sin API key', description: 'Configura GEMINI_API_KEY en el .env del backend', reason: '', category: 'info' }];
    }

    try {
        const model = getModel();

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

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(clean);
        return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
    } catch (err) {
        console.error('[AI] Error shopping:', err.message);
        return [{ name: 'Error', description: 'No se pudieron obtener recomendaciones.', reason: err.message, category: 'error' }];
    }
};

module.exports = { recommendByWeather, chatAboutWardrobe, recommendPurchases };
