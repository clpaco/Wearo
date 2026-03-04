// Servicio de calendario — peticiones al backend
import api from './api';

// Obtener entradas por rango de fechas
export const getCalendarRange = async (startDate, endDate) => {
    const { data } = await api.get(`/calendar?start=${startDate}&end=${endDate}`);
    return data;
};

// Obtener entradas de un día (devuelve array)
export const getCalendarDate = async (date) => {
    const { data } = await api.get(`/calendar/${date}`);
    return data;
};

// Añadir entrada (outfit o prendas sueltas)
export const addEntry = async (date, { outfitId, garmentIds, notes }) => {
    const { data } = await api.post('/calendar', { date, outfitId, garmentIds, notes });
    return data;
};

// Eliminar entrada por ID
export const removeEntry = async (entryId) => {
    const { data } = await api.delete(`/calendar/entry/${entryId}`);
    return data;
};

// Obtener clima actual por coordenadas
export const getWeatherByCoords = async (lat, lon) => {
    const { data } = await api.get(`/calendar/weather?lat=${lat}&lon=${lon}`);
    return data.clima;
};

// Obtener clima por nombre de ciudad
export const getWeatherByCity = async (city) => {
    const { data } = await api.get(`/calendar/weather?city=${encodeURIComponent(city)}`);
    return data.clima;
};

// Obtener pronóstico 5 días
export const getForecast = async (lat, lon) => {
    const { data } = await api.get(`/calendar/forecast?lat=${lat}&lon=${lon}`);
    return data;
};

// Buscar ciudades con Nominatim (OpenStreetMap) — llamada directa sin backend
export const searchCities = async (query) => {
    if (!query || query.trim().length < 2) return [];
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query.trim())}&format=json&addressdetails=1&limit=7`,
            {
                headers: {
                    'User-Agent': 'Wearo/1.0 (educational project)',
                    'Accept-Language': 'es',
                },
            }
        );
        const json = await res.json();
        const seen = new Set();
        return json
            .filter((item) => {
                const t = item.type || '';
                const cls = item.class || '';
                return cls === 'place' || ['city','town','village','municipality','administrative','suburb'].includes(t);
            })
            .map((item) => {
                const addr = item.address || {};
                const cityName = addr.city || addr.town || addr.village || addr.municipality || item.name;
                const country = addr.country || '';
                const region = addr.state || addr.county || '';
                const displayShort = [cityName, region, country].filter(Boolean).join(', ');
                return {
                    place_id: item.place_id,
                    name: cityName,
                    displayShort,
                    lat: parseFloat(item.lat),
                    lon: parseFloat(item.lon),
                };
            })
            .filter((item) => {
                if (!item.name || seen.has(item.name)) return false;
                seen.add(item.name);
                return true;
            });
    } catch {
        return [];
    }
};
