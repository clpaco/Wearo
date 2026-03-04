// Servicio del clima — Open-Meteo API (gratis, sin API key)
// Docs: https://open-meteo.com/en/docs
const axios = require('axios');

const BASE_URL = 'https://api.open-meteo.com/v1';

// Mapeo de códigos WMO a descripciones en español
const WMO_CODES = {
    0: 'Despejado',
    1: 'Principalmente despejado',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Niebla',
    48: 'Niebla con escarcha',
    51: 'Llovizna ligera',
    53: 'Llovizna',
    55: 'Llovizna intensa',
    56: 'Llovizna helada ligera',
    57: 'Llovizna helada',
    61: 'Lluvia ligera',
    63: 'Lluvia',
    65: 'Lluvia intensa',
    66: 'Lluvia helada ligera',
    67: 'Lluvia helada',
    71: 'Nieve ligera',
    73: 'Nieve',
    75: 'Nieve intensa',
    77: 'Granizo',
    80: 'Chubascos',
    81: 'Chubascos moderados',
    82: 'Chubascos intensos',
    85: 'Chubascos de nieve',
    86: 'Chubascos de nieve intensos',
    95: 'Tormenta',
    96: 'Tormenta con granizo',
    99: 'Tormenta con granizo intenso',
};

const getDescription = (code) => WMO_CODES[code] ?? 'Clima desconocido';

// Obtener el clima actual por coordenadas
const getCurrentWeather = async (lat, lon) => {
    try {
        const { data } = await axios.get(`${BASE_URL}/forecast`, {
            params: {
                latitude: lat,
                longitude: lon,
                current: 'temperature_2m,apparent_temperature,weathercode,windspeed_10m,precipitation',
                timezone: 'auto',
                forecast_days: 1,
            },
            timeout: 10000,
        });

        const cur = data.current;
        return {
            temp: Math.round(cur.temperature_2m),
            feelsLike: Math.round(cur.apparent_temperature),
            description: getDescription(cur.weathercode),
            icon: String(cur.weathercode),
            windspeed: Math.round(cur.windspeed_10m),
            city: null, // El nombre de ciudad viene del frontend (Nominatim)
        };
    } catch (err) {
        console.error('Error obteniendo clima (Open-Meteo):', err.message);
        return null;
    }
};

// Compatibilidad: obtener clima por nombre de ciudad usando Nominatim + Open-Meteo
const getWeatherByCity = async (city) => {
    try {
        // Geocodificar ciudad con Nominatim
        const geo = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: { q: city, format: 'json', limit: 1 },
            headers: { 'User-Agent': 'Wearo/1.0 (educational project)' },
            timeout: 6000,
        });
        if (!geo.data || geo.data.length === 0) return null;
        const { lat, lon } = geo.data[0];
        const weather = await getCurrentWeather(parseFloat(lat), parseFloat(lon));
        if (weather) weather.city = city;
        return weather;
    } catch (err) {
        console.error('Error geocodificando ciudad:', err.message);
        return null;
    }
};

// Obtener pronóstico de 5 días
const getForecast = async (lat, lon) => {
    try {
        const { data } = await axios.get(`${BASE_URL}/forecast`, {
            params: {
                latitude: lat,
                longitude: lon,
                daily: 'temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum',
                timezone: 'auto',
                forecast_days: 6,
            },
            timeout: 10000,
        });

        const daily = data.daily;
        return daily.time.slice(0, 5).map((date, i) => ({
            date,
            temp: Math.round((daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2),
            tempMax: Math.round(daily.temperature_2m_max[i]),
            tempMin: Math.round(daily.temperature_2m_min[i]),
            description: getDescription(daily.weathercode[i]),
            icon: String(daily.weathercode[i]),
        }));
    } catch (err) {
        console.error('Error obteniendo pronóstico (Open-Meteo):', err.message);
        return [];
    }
};

module.exports = { getCurrentWeather, getWeatherByCity, getForecast };
