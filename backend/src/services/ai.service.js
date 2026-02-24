// Servicio de IA — Gemini (outfits) + Perplexity (compras)
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY || '';

// ── Helpers de contexto ──────────────────────────────────────────────────────

const buildWardrobeContext = (garments = [], outfits = []) => {
    const gStr = garments.length
        ? garments
              .map(
                  (g) =>
                      `- ${g.name} (categoría: ${g.category || '?'}, color: ${g.color || '?'}, temporada: ${g.season || 'todas'}, ocasión: ${g.occasion || 'casual'})`
              )
              .join('\n')
        : 'Sin prendas aún.';

    const oStr = outfits.length
        ? outfits
              .map((o) => {
                  const items = Array.isArray(o.garments) ? o.garments.map((g) => g.name).join(', ') : '';
                  return `- "${o.name}" (ocasión: ${o.occasion || '?'}, temporada: ${o.season || '?'}${items ? `, prendas: ${items}` : ''})`;
              })
              .join('\n')
        : 'Sin outfits creados aún.';

    return { gStr, oStr };
};

// ── Gemini: recomendar outfit por clima ─────────────────────────────────────

const recommendByWeather = async ({ weather, garments = [], outfits = [] }) => {
    if (!GEMINI_KEY) return { outfitName: null, reason: 'Configura GEMINI_API_KEY para usar esta función.' };

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const { gStr, oStr } = buildWardrobeContext(garments, outfits);

        const prompt = `Eres un asistente de moda personal. El usuario tiene el siguiente armario:

PRENDAS:
${gStr}

OUTFITS GUARDADOS:
${oStr}

CLIMA ACTUAL: ${weather.temp}°C, ${weather.description}, en ${weather.city || 'su ciudad'}.

Basándote en el clima actual, recomienda el outfit guardado más adecuado (o una combinación de prendas si no hay outfits).
Responde en este formato JSON exacto sin markdown:
{
  "outfitName": "nombre del outfit o combinación",
  "reason": "explicación breve de por qué es ideal para este clima (máx 2 frases)"
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        // Limpiar posible markdown
        const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(clean);
    } catch (err) {
        console.error('Error Gemini recommendByWeather:', err.message);
        return { outfitName: null, reason: 'No se pudo obtener una recomendación en este momento.' };
    }
};

// ── Gemini: chat sobre armario ───────────────────────────────────────────────

const chatAboutWardrobe = async ({ messages = [], garments = [], outfits = [], weather = null }) => {
    if (!GEMINI_KEY) return 'Configura GEMINI_API_KEY para usar el chat de IA.';

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const { gStr, oStr } = buildWardrobeContext(garments, outfits);

        const weatherCtx = weather
            ? `\nCLIMA ACTUAL: ${weather.temp}°C, ${weather.description} en ${weather.city || 'su ciudad'}.`
            : '';

        const systemContext = `Eres un asistente de moda personal llamado StyleAI. Tienes acceso al armario completo del usuario.

PRENDAS DEL USUARIO:
${gStr}

OUTFITS DEL USUARIO:
${oStr}${weatherCtx}

Responde siempre en español, de forma amigable y útil. Si el usuario pregunta qué ponerse para un evento, sugiere outfits guardados o combinaciones de sus prendas. Sé conciso (máx 3-4 frases).`;

        // Construir historial de chat (Gemini usa 'user' y 'model')
        const history = messages.slice(0, -1).map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
        }));

        const chat = model.startChat({
            history,
            systemInstruction: systemContext,
        });

        const lastMsg = messages[messages.length - 1];
        const result = await chat.sendMessage(lastMsg.content);
        return result.response.text();
    } catch (err) {
        console.error('Error Gemini chat:', err.message);
        return 'Lo siento, no pude procesar tu pregunta en este momento. Inténtalo de nuevo.';
    }
};

// ── Perplexity: recomendar prendas para comprar ──────────────────────────────

const recommendPurchases = async ({ garments = [] }) => {
    if (!PERPLEXITY_KEY) {
        return [{ name: 'Sin API key', description: 'Configura PERPLEXITY_API_KEY', reason: '', category: 'info' }];
    }

    try {
        const categories = {};
        garments.forEach((g) => {
            const cat = g.category || 'otro';
            categories[cat] = (categories[cat] || 0) + 1;
        });
        const wardrobeSummary = Object.entries(categories)
            .map(([cat, count]) => `${cat}: ${count} prenda(s)`)
            .join(', ');

        const prompt = wardrobeSummary
            ? `El usuario tiene este armario: ${wardrobeSummary}. ¿Qué 5 prendas concretas le recomendarías comprar para completar outfits versátiles y variados? Para cada una incluye nombre, descripción breve, por qué la necesita y categoría.`
            : 'El usuario tiene un armario vacío. ¿Qué 5 prendas básicas esenciales le recomendarías comprar para empezar? Para cada una incluye nombre, descripción breve, por qué la necesita y categoría.';

        const { data } = await axios.post(
            'https://api.perplexity.ai/chat/completions',
            {
                model: 'sonar',
                messages: [
                    {
                        role: 'system',
                        content:
                            'Eres un estilista personal. Responde SIEMPRE en JSON puro, sin markdown, con este formato exacto: [{"name":"...","description":"...","reason":"...","category":"..."}]',
                    },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 800,
            },
            {
                headers: {
                    Authorization: `Bearer ${PERPLEXITY_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            }
        );

        const text = data.choices[0].message.content.trim();
        const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(clean);
        return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
    } catch (err) {
        console.error('Error Perplexity shopping:', err.message);
        return [{ name: 'Error', description: 'No se pudieron obtener recomendaciones.', reason: err.message, category: 'error' }];
    }
};

module.exports = { recommendByWeather, chatAboutWardrobe, recommendPurchases };
