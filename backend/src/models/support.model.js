// Modelo de Soporte — tickets de usuarios hacia admins
const { query } = require('../config/db');

// Auto-migracion: crear tabla support_tickets
(async () => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS support_tickets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                message TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                assigned_admin_id INTEGER REFERENCES users(id),
                resolved_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
    } catch (e) { console.warn('support_tickets migration:', e.message); }
})();

// Crear ticket (usuario)
const createTicket = async (userId, message) => {
    const result = await query(
        `INSERT INTO support_tickets (user_id, message) VALUES ($1, $2) RETURNING *`,
        [userId, message]
    );
    return result.rows[0];
};

// Listar tickets (admin) con filtro opcional de estado
const getTickets = async (status) => {
    let sql = `
        SELECT st.*,
            json_build_object('id', u.id, 'fullName', u.full_name, 'avatarUrl', u.avatar_url, 'username', u.username) AS requester,
            CASE WHEN st.assigned_admin_id IS NOT NULL
                THEN (SELECT json_build_object('id', a.id, 'fullName', a.full_name, 'adminTag', a.admin_tag) FROM users a WHERE a.id = st.assigned_admin_id)
                ELSE NULL
            END AS assigned_admin
        FROM support_tickets st
        JOIN users u ON st.user_id = u.id
    `;
    const params = [];
    if (status) {
        sql += ' WHERE st.status = $1';
        params.push(status);
    }
    sql += ' ORDER BY st.created_at DESC';
    const result = await query(sql, params);
    return result.rows;
};

// Asignar ticket a un admin (marca como in_progress)
const assignTicket = async (ticketId, adminId) => {
    const result = await query(
        `UPDATE support_tickets SET status = 'in_progress', assigned_admin_id = $2 WHERE id = $1 RETURNING *`,
        [ticketId, adminId]
    );
    return result.rows[0];
};

// Resolver ticket
const resolveTicket = async (ticketId) => {
    const result = await query(
        `UPDATE support_tickets SET status = 'resolved', resolved_at = NOW() WHERE id = $1 RETURNING *`,
        [ticketId]
    );
    return result.rows[0];
};

// Tickets resueltos por un admin especifico
const getMyResolvedTickets = async (adminId) => {
    const result = await query(
        `SELECT st.*,
            json_build_object('id', u.id, 'fullName', u.full_name, 'avatarUrl', u.avatar_url) AS requester
         FROM support_tickets st
         JOIN users u ON st.user_id = u.id
         WHERE st.assigned_admin_id = $1 AND st.status = 'resolved'
         ORDER BY st.resolved_at DESC`,
        [adminId]
    );
    return result.rows;
};

module.exports = { createTicket, getTickets, assignTicket, resolveTicket, getMyResolvedTickets };
