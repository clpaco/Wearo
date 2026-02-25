// Modelo de Mensajes Directos — conversaciones e historiales de chat
const { query } = require('../config/db');

// Auto-migrate: crear tablas secuencialmente para respetar FK
(async () => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS conversations (
                id SERIAL PRIMARY KEY,
                participant_1 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                participant_2 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                last_message_text TEXT DEFAULT '',
                last_message_at TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(participant_1, participant_2)
            )
        `);
        await query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                text TEXT NOT NULL DEFAULT '',
                media_url TEXT,
                media_type VARCHAR(20),
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await query('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at)');
        await query('CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participant_1, participant_2)');
        // Add media columns if upgrading from old schema
        await query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT');
        await query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type VARCHAR(20)');
    } catch (e) {
        console.warn('[Messages] Migration error:', e.message);
    }
})();

// Obtener o crear conversación entre dos usuarios
const getOrCreateConversation = async (userId1, userId2) => {
    const p1 = Math.min(userId1, userId2);
    const p2 = Math.max(userId1, userId2);

    let result = await query(
        'SELECT * FROM conversations WHERE participant_1 = $1 AND participant_2 = $2',
        [p1, p2]
    );
    if (result.rows[0]) return result.rows[0];

    result = await query(
        `INSERT INTO conversations (participant_1, participant_2)
         VALUES ($1, $2)
         ON CONFLICT (participant_1, participant_2) DO UPDATE SET id = conversations.id
         RETURNING *`,
        [p1, p2]
    );
    return result.rows[0];
};

// Obtener conversación enriquecida con datos del otro usuario
const getConversationWithUser = async (conversationId, currentUserId) => {
    const result = await query(
        `SELECT c.*,
            CASE WHEN c.participant_1 = $2 THEN c.participant_2 ELSE c.participant_1 END AS other_user_id,
            json_build_object(
                'id', u.id,
                'fullName', u.full_name,
                'avatarUrl', u.avatar_url
            ) AS other_user,
            (SELECT COUNT(*)::int FROM messages m
             WHERE m.conversation_id = c.id AND m.sender_id != $2 AND m.is_read = false
            ) AS unread_count
        FROM conversations c
        JOIN users u ON u.id = CASE WHEN c.participant_1 = $2 THEN c.participant_2 ELSE c.participant_1 END
        WHERE c.id = $1`,
        [conversationId, currentUserId]
    );
    return result.rows[0] || null;
};

// Listar conversaciones de un usuario con info del otro participante
const getConversations = async (userId) => {
    const result = await query(
        `SELECT c.*,
            CASE WHEN c.participant_1 = $1 THEN c.participant_2 ELSE c.participant_1 END AS other_user_id,
            json_build_object(
                'id', u.id,
                'fullName', u.full_name,
                'avatarUrl', u.avatar_url
            ) AS other_user,
            (SELECT COUNT(*)::int FROM messages m
             WHERE m.conversation_id = c.id AND m.sender_id != $1 AND m.is_read = false
            ) AS unread_count
        FROM conversations c
        JOIN users u ON u.id = CASE WHEN c.participant_1 = $1 THEN c.participant_2 ELSE c.participant_1 END
        WHERE c.participant_1 = $1 OR c.participant_2 = $1
        ORDER BY c.last_message_at DESC`,
        [userId]
    );
    return result.rows;
};

// Obtener mensajes de una conversación con paginación
const getMessages = async (conversationId, { limit = 50, before = null } = {}) => {
    let sql = `SELECT m.*,
        json_build_object('id', u.id, 'fullName', u.full_name, 'avatarUrl', u.avatar_url) AS sender
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = $1`;
    const params = [conversationId];

    if (before) {
        sql += ` AND m.id < $${params.length + 1}`;
        params.push(before);
    }

    sql += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    return result.rows.reverse();
};

// Enviar mensaje (texto o media)
const sendMessage = async (conversationId, senderId, text, mediaUrl = null, mediaType = null) => {
    const result = await query(
        `INSERT INTO messages (conversation_id, sender_id, text, media_url, media_type)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [conversationId, senderId, text || '', mediaUrl, mediaType]
    );
    const message = result.rows[0];

    const previewText = mediaType === 'photo' ? '📷 Foto'
        : mediaType === 'audio' ? '🎤 Audio'
        : mediaType === 'post' ? '📌 Publicación'
        : (text || '').substring(0, 100);

    await query(
        `UPDATE conversations SET last_message_text = $1, last_message_at = NOW() WHERE id = $2`,
        [previewText, conversationId]
    );

    const userResult = await query(
        'SELECT id, full_name, avatar_url FROM users WHERE id = $1',
        [senderId]
    );
    const u = userResult.rows[0];

    return {
        ...message,
        sender: { id: u.id, fullName: u.full_name, avatarUrl: u.avatar_url },
    };
};

// Marcar mensajes como leídos
const markAsRead = async (conversationId, userId) => {
    await query(
        `UPDATE messages SET is_read = true
         WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
        [conversationId, userId]
    );
};

// Verificar que un usuario pertenece a una conversación
const isParticipant = async (conversationId, userId) => {
    const result = await query(
        'SELECT id FROM conversations WHERE id = $1 AND (participant_1 = $2 OR participant_2 = $2)',
        [conversationId, userId]
    );
    return !!result.rows[0];
};

// Contar total mensajes no leídos
const getUnreadTotal = async (userId) => {
    const result = await query(
        `SELECT COUNT(*)::int AS count FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE (c.participant_1 = $1 OR c.participant_2 = $1)
           AND m.sender_id != $1 AND m.is_read = false`,
        [userId]
    );
    return result.rows[0].count;
};

// Buscar usuarios por nombre
const searchUsers = async (searchTerm, currentUserId, limit = 20) => {
    const result = await query(
        `SELECT id, full_name AS "fullName", avatar_url AS "avatarUrl"
         FROM users
         WHERE id != $1 AND full_name ILIKE $2
         ORDER BY full_name
         LIMIT $3`,
        [currentUserId, `%${searchTerm}%`, limit]
    );
    return result.rows;
};

module.exports = {
    getOrCreateConversation, getConversationWithUser, getConversations, getMessages,
    sendMessage, markAsRead, isParticipant, getUnreadTotal, searchUsers,
};
