// Servicio del clima — OpenWeatherMap API
// Usa una API key gratuita de https://openweathermap.org/api
const axios = require('axios');

const API_KEY = process.env.WEATHER_API_KEY || '';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Obtener el clima actual por coordenadas
const getCurrentWeather = async (lat, lon) => {
    if (!API_KEY) {
        return null; // Sin API key, devolver null (el clima es opcional)
    }

    try {
        const { data } = await axios.get(`${BASE_URL}/weather`, {
            params: {
                lat,
                lon,
                appid: API_KEY,
                units: 'metric',
                lang: 'es',
            },
        });

        return {
            temp: Math.round(data.main.temp),
            description: data.weather[0].description,
            icon: data.weather[0].icon,
            feelsLike: Math.round(data.main.feels_like),
            humidity: data.main.humidity,
            city: data.name,
        };
    } catch (err) {
        console.error('Error obteniendo clima:', err.message);
        return null;
    }
};

// Obtener el clima actual por nombre de ciudad
const getWeatherByCity = async (city) => {
    if (!API_KEY) return null;
    try {
        const { data } = await axios.get(`${BASE_URL}/weather`, {
            params: { q: city, appid: API_KEY, units: 'metric', lang: 'es' },
        });
        return {
            temp: Math.round(data.main.temp),
            description: data.weather[0].description,
            icon: data.weather[0].icon,
            feelsLike: Math.round(data.main.feels_like),
            humidity: data.main.humidity,
            city: data.name,
        };
    } catch (err) {
        console.error('Error obteniendo clima por ciudad:', err.message);
        return null;
    }
};

// Obtener pronóstico de 5 días
const getForecast = async (lat, lon) => {
    if (!API_KEY) return [];

    try {
        const { data } = await axios.get(`${BASE_URL}/forecast`, {
            params: {
                lat,
                lon,
                appid: API_KEY,
                units: 'metric',
                lang: 'es',
                cnt: 40, // 5 días × 8 intervalos de 3h
            },
        });

        // Agrupar por día y tomar el pronóstico del mediodía
        const daily = {};
        data.list.forEach((entry) => {
            const date = entry.dt_txt.split(' ')[0];
            const hour = parseInt(entry.dt_txt.split(' ')[1].split(':')[0]);
            if (!daily[date] || Math.abs(hour - 12) < Math.abs(daily[date].hour - 12)) {
                daily[date] = {
                    hour,
                    temp: Math.round(entry.main.temp),
                    description: entry.weather[0].description,
                    icon: entry.weather[0].icon,
                };
            }
        });

        return Object.entries(daily).map(([date, weather]) => ({
            date,
            ...weather,
        }));
    } catch (err) {
        console.error('Error obteniendo pronóstico:', err.message);
        return [];
    }
};

module.exports = { getCurrentWeather, getForecast, getWeatherByCity };
