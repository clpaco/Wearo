// Controlador de Soporte — enviar y gestionar tickets
const supportModel = require('../models/support.model');

// POST /api/v1/support — cualquier usuario autenticado crea un ticket
const submitTicket = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ error: true, mensaje: 'El mensaje es obligatorio' });
        }
        const ticket = await supportModel.createTicket(req.user.id, message.trim());
        res.status(201).json({ mensaje: 'Ticket enviado', ticket });
    } catch (err) {
        console.error('Error submitTicket:', err);
        res.status(500).json({ error: true, mensaje: 'Error al enviar ticket' });
    }
};

// GET /admin/support — listar tickets (admin)
const getTickets = async (req, res) => {
    try {
        const status = req.query.status || null;
        const tickets = await supportModel.getTickets(status);
        res.json({ tickets });
    } catch (err) {
        console.error('Error getTickets:', err);
        res.status(500).json({ error: true, mensaje: 'Error al obtener tickets' });
    }
};

// PUT /admin/support/:id/assign — asignar ticket al admin actual
const assignTicket = async (req, res) => {
    try {
        const ticket = await supportModel.assignTicket(req.params.id, req.user.id);
        if (!ticket) return res.status(404).json({ error: true, mensaje: 'Ticket no encontrado' });
        res.json({ mensaje: 'Ticket asignado', ticket });
    } catch (err) {
        console.error('Error assignTicket:', err);
        res.status(500).json({ error: true, mensaje: 'Error al asignar ticket' });
    }
};

// PUT /admin/support/:id/resolve — marcar ticket como resuelto
const resolveTicket = async (req, res) => {
    try {
        const ticket = await supportModel.resolveTicket(req.params.id);
        if (!ticket) return res.status(404).json({ error: true, mensaje: 'Ticket no encontrado' });
        res.json({ mensaje: 'Ticket resuelto', ticket });
    } catch (err) {
        console.error('Error resolveTicket:', err);
        res.status(500).json({ error: true, mensaje: 'Error al resolver ticket' });
    }
};

module.exports = { submitTicket, getTickets, assignTicket, resolveTicket };
