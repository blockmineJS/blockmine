const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getIOSafe } = require('../../real-time/socketHandler');
const prisma = require('../../lib/prisma');

const router = express.Router();

/**
 * @route   GET /api/chat/messages
 * @desc    Получить последние сообщения чата
 * @access  Private
 */
router.get('/messages', authenticate, async (req, res) => {
    try {
        const { limit = 100, before } = req.query;

        // Валидация параметров пагинации
        const parsedLimit = parseInt(limit);
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
            return res.status(400).json({ error: 'Параметр limit должен быть числом от 1 до 200' });
        }

        let parsedBefore = null;
        if (before) {
            parsedBefore = parseInt(before);
            if (isNaN(parsedBefore) || parsedBefore < 1) {
                return res.status(400).json({ error: 'Параметр before должен быть положительным числом' });
            }
        }

        const messages = await prisma.panelChatMessage.findMany({
            where: {
                isDeleted: false,
                ...(parsedBefore && { id: { lt: parsedBefore } })
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: parsedLimit
        });

        // Возвращаем в хронологическом порядке (старые → новые)
        res.json(messages.reverse());
    } catch (error) {
        console.error('[Chat Messages Error]', error);
        res.status(500).json({ error: 'Не удалось загрузить сообщения' });
    }
});

/**
 * @route   POST /api/chat/messages
 * @desc    Отправить сообщение в чат
 * @access  Private
 */
router.post('/messages', authenticate, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Сообщение не может быть пустым' });
        }

        if (message.length > 2000) {
            return res.status(400).json({ error: 'Сообщение слишком длинное (макс. 2000 символов)' });
        }

        const newMessage = await prisma.panelChatMessage.create({
            data: {
                userId: req.user.userId,
                message: message.trim()
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            }
        });

        // Отправляем Socket.io событие о новом сообщении
        const io = getIOSafe();
        io.to('panel-chat').emit('chat:new-message', newMessage);

        res.status(201).json(newMessage);
    } catch (error) {
        console.error('[Chat Send Error]', error);
        res.status(500).json({ error: 'Не удалось отправить сообщение' });
    }
});

/**
 * @route   PUT /api/chat/messages/:id
 * @desc    Редактировать сообщение
 * @access  Private
 */
router.put('/messages/:id', authenticate, async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Сообщение не может быть пустым' });
        }

        const existingMessage = await prisma.panelChatMessage.findUnique({
            where: { id: messageId }
        });

        if (!existingMessage) {
            return res.status(404).json({ error: 'Сообщение не найдено' });
        }

        if (existingMessage.isDeleted) {
            return res.status(400).json({ error: 'Нельзя редактировать удалённое сообщение' });
        }

        if (existingMessage.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Вы можете редактировать только свои сообщения' });
        }

        const updatedMessage = await prisma.panelChatMessage.update({
            where: { id: messageId },
            data: {
                message: message.trim(),
                isEdited: true
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            }
        });

        // Отправляем Socket.io событие о редактировании сообщения
        const io = getIOSafe();
        io.to('panel-chat').emit('chat:message-edited', updatedMessage);

        res.json(updatedMessage);
    } catch (error) {
        console.error('[Chat Edit Error]', error);
        res.status(500).json({ error: 'Не удалось отредактировать сообщение' });
    }
});

/**
 * @route   DELETE /api/chat/messages/:id
 * @desc    Удалить сообщение
 * @access  Private
 */
router.delete('/messages/:id', authenticate, async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);

        const existingMessage = await prisma.panelChatMessage.findUnique({
            where: { id: messageId }
        });

        if (!existingMessage) {
            return res.status(404).json({ error: 'Сообщение не найдено' });
        }

        // Только автор или админ может удалить
        const isAdmin = req.user.permissions && (
            req.user.permissions.includes('*') ||
            req.user.permissions.includes('panel:user:delete')
        );
        if (existingMessage.userId !== req.user.userId && !isAdmin) {
            return res.status(403).json({ error: 'Нет прав на удаление этого сообщения' });
        }

        await prisma.panelChatMessage.update({
            where: { id: messageId },
            data: { isDeleted: true }
        });

        // Отправляем Socket.io событие об удалении сообщения
        const io = getIOSafe();
        io.to('panel-chat').emit('chat:message-deleted', { messageId });

        res.status(204).send();
    } catch (error) {
        console.error('[Chat Delete Error]', error);
        res.status(500).json({ error: 'Не удалось удалить сообщение' });
    }
});

module.exports = router;
