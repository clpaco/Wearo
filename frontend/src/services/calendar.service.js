// Servicio de calendario — peticiones al backend
import api from './api';

// Obtener entradas por rango de fechas
export const getCalendarRange = async (startDate, endDate) => {
    const { data } = await api.get(`/calendar?start=${startDate}&end=${endDate}`);
    return data;
};

// Obtener entrada de un día
export const getCalendarDate = async (date) => {
    const { data } = await api.get(`/calendar/${date}`);
    return data;
};

// Asignar outfit a una fecha
export const assignOutfit = async (date, outfitId, notes) => {
    const { data } = await api.post('/calendar', { date, outfitId, notes });
    return data;
};

// Eliminar entrada del calendario
export const removeEntry = async (date) => {
    const { data } = await api.delete(`/calendar/${date}`);
    return data;
};

// Obtener clima actual
export const getWeather = async (lat, lon) => {
    const { data } = await api.get(`/calendar/weather?lat=${lat}&lon=${lon}`);
    return data;
};

// Obtener pronóstico 5 días
export const getForecast = async (lat, lon) => {
    const { data } = await api.get(`/calendar/forecast?lat=${lat}&lon=${lon}`);
    return data;
};
