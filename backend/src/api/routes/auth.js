const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const config = require('../../config');
const { authenticate, authorize } = require('../middleware/auth');
const path = require('path');
const os = require('os');

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = config.security.jwtSecret;
const JWT_EXPIRES_IN = '7d';

const activeResetTokens = new Map();

function ownerOnly(req, res, next) {
    if (req.user && req.user.userId === 1) return next();
    return res.status(403).json({ error: 'Только владелец может изменять права пользователей и роли.' });
}

/**
 * @route   GET /api/auth/status
 * @desc    Проверяет, была ли произведена первоначальная настройка (создан админ)
 * @access  Public
 */
router.get('/status', async (req, res) => {
    try {
        const userCount = await prisma.panelUser.count();
        res.json({ needsSetup: userCount === 0 });
    } catch (error) {
        console.error('[Auth Status Error]', error);
        res.status(500).json({ error: 'Не удалось проверить статус сервера' });
    }
});

/**
 * @route   GET /api/auth/config-path
 * @desc    Получить путь к конфигурационному файлу
 * @access  Public
 */
router.get('/config-path', (req, res) => {
    const configPath = path.join(os.homedir(), '.blockmine', 'config.json');
    res.json({ configPath });
});

/**
 * @route   POST /api/auth/setup
 * @desc    Создает первого пользователя с ролью администратора
 * @access  Public (только если нет других пользователей)
 */
router.post('/setup', async (req, res) => {
    try {
        const userCount = await prisma.panelUser.count();
        if (userCount > 0) {
            return res.status(403).json({ error: 'Настройка уже произведена.' });
        }

        const { username, password } = req.body;
        if (!username || !password || password.length < 4) {
            return res.status(400).json({ error: 'Имя пользователя и пароль (минимум 4 символа) обязательны.' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        
        let newUser; 

        await prisma.$transaction(async (tx) => {
            const adminPermissions = ALL_PERMISSIONS
                .map(p => p.id)
                .filter(id => id !== '*' && id !== 'plugin:develop');
                
            const adminRole = await tx.panelRole.upsert({
                where: { name: 'Admin' },
                update: {},
                create: {
                    name: 'Admin',
                    permissions: JSON.stringify(adminPermissions)
                },
            });

            newUser = await tx.panelUser.create({
                data: {
                    username,
                    passwordHash: hashedPassword,
                    roleId: adminRole.id,
                },
                include: { role: true }
            });
        });


        const permissions = JSON.parse(newUser.role.permissions || '[]');
        
        const payload = {
            userId: newUser.id,
            username: newUser.username,
            permissions: permissions,
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        res.status(201).json({
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                permissions: permissions,
            }
        });

    } catch (error) {
        if (error.code === 'P2002') {
             return res.status(409).json({ error: 'Пользователь с таким именем уже существует.' });
        }
        console.error('[Setup Error]', error);
        res.status(500).json({ error: 'Не удалось создать администратора' });
    }
});

/**
 * @route   POST /api/auth/recovery/verify
 * @desc    Проверка кода восстановления
 * @access  Public
 */
router.post('/recovery/verify', async (req, res) => {
    try {
        const { recoveryCode } = req.body;
        
        if (!recoveryCode) {
            return res.status(400).json({ error: 'Код восстановления обязателен' });
        }
        
        if (recoveryCode !== config.security.adminRecoveryCode) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return res.status(401).json({ error: 'Неверный код восстановления' });
        }
        
        const rootUser = await prisma.panelUser.findFirst({
            orderBy: { id: 'asc' },
            include: { role: true }
        });
        
        if (!rootUser) {
            return res.status(404).json({ error: 'В системе нет ни одного пользователя. Выполните первоначальную настройку.' });
        }
        
        const tokenId = crypto.randomBytes(16).toString('hex');
        const resetToken = jwt.sign(
            { 
                userId: rootUser.id,
                type: 'password-reset',
                tokenId: tokenId,
                timestamp: Date.now()
            },
            JWT_SECRET,
            { expiresIn: '5m' }
        );
        
        activeResetTokens.set(tokenId, {
            userId: rootUser.id,
            createdAt: Date.now(),
            used: false
        });
        
        setTimeout(() => {
            activeResetTokens.delete(tokenId);
        }, 5 * 60 * 1000);
        
        res.json({ 
            success: true,
            username: rootUser.username,
            resetToken
        });
        
    } catch (error) {
        console.error('[Recovery Verify Error]', error);
        res.status(500).json({ error: 'Ошибка при проверке кода восстановления' });
    }
});

/**
 * @route   POST /api/auth/recovery/reset
 * @desc    Сброс пароля с использованием токена
 * @access  Public (с валидным токеном сброса)
 */
router.post('/recovery/reset', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        
        if (!resetToken || !newPassword) {
            return res.status(400).json({ error: 'Токен и новый пароль обязательны' });
        }
        
        if (newPassword.length < 4) {
            return res.status(400).json({ error: 'Пароль должен быть не менее 4 символов' });
        }
        
        let decoded;
        try {
            decoded = jwt.verify(resetToken, JWT_SECRET);
            if (decoded.type !== 'password-reset') {
                throw new Error('Invalid token type');
            }
            
            const tokenInfo = activeResetTokens.get(decoded.tokenId);
            if (!tokenInfo) {
                throw new Error('Token not found in active tokens');
            }
            
            if (tokenInfo.used) {
                throw new Error('Token already used');
            }
            
            if (tokenInfo.userId !== decoded.userId) {
                throw new Error('Token userId mismatch');
            }
            
        } catch (err) {
            return res.status(401).json({ error: 'Недействительный или истекший токен' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        const updatedUser = await prisma.panelUser.update({
            where: { id: decoded.userId },
            data: { passwordHash: hashedPassword },
            select: { username: true }
        });
        
        const tokenInfo = activeResetTokens.get(decoded.tokenId);
        tokenInfo.used = true;
        
        activeResetTokens.delete(decoded.tokenId);
        
        res.json({ 
            message: 'Пароль успешно сброшен', 
            username: updatedUser.username 
        });
        
    } catch (error) {
        console.error('[Recovery Reset Error]', error);
        res.status(500).json({ error: 'Ошибка при сбросе пароля' });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Аутентифицирует пользователя и возвращает токен
 * @access  Public
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
        }

        const user = await prisma.panelUser.findUnique({
            where: { username },
            include: { role: true },
        });

        if (!user) {
            return res.status(401).json({ error: 'Неверные учетные данные' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Неверные учетные данные' });
        }

        const permissions = JSON.parse(user.role.permissions || '[]');

        const payload = {
            userId: user.id,
            username: user.username,
            permissions: permissions,
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                permissions: permissions,
            }
        });

    } catch (error) {
        console.error('[Login Error]', error);
        res.status(500).json({ error: 'Ошибка входа в систему' });
    }
});


/**
 * @route   GET /api/auth/me
 * @desc    Получить данные текущего пользователя по токену
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await prisma.panelUser.findUnique({
            where: { id: req.user.userId },
            select: { id: true, username: true, role: { select: { permissions: true } } }
        });

        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден." });
        }
        
        res.json({
            id: user.id,
            username: user.username,
            permissions: JSON.parse(user.role.permissions || '[]')
        });
    } catch (error) {
        res.status(500).json({ error: "Ошибка сервера" });
    }
});


/**
 * @route   GET /api/auth/users
 * @desc    Получить всех пользователей и их роли
 * @access  Private (Admin only)
 */
router.get('/users', authenticate, authorize('panel:user:list'), async (req, res) => {
    try {
        const users = await prisma.panelUser.findMany({
            include: { role: true, botAccess: { include: { bot: { select: { id: true, username: true } } } } },
            orderBy: { username: 'asc' }
        });
        res.json(users.map(u => ({
            ...u,
            botAccess: u.botAccess.map(a => ({ botId: a.botId, bot: a.bot }))
        })));
    } catch (error) {
        res.status(500).json({ error: 'Не удалось получить пользователей' });
    }
});

/**
 * @route   POST /api/auth/users
 * @desc    Создать нового пользователя
 * @access  Private (Admin only)
 */
router.post('/users', authenticate, ownerOnly, authorize('panel:user:create'), async (req, res) => {
    const { username, password, roleId, allBots = true, botIds = [] } = req.body;
    if (!username || !password || !roleId) {
        return res.status(400).json({ error: 'Имя, пароль и роль обязательны' });
    }
     if (password.length < 4) {
        return res.status(400).json({ error: 'Пароль должен быть не менее 4 символов' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await prisma.panelUser.create({
            data: {
                username,
                passwordHash: hashedPassword,
                roleId: parseInt(roleId, 10),
                allBots: !!allBots,
                botAccess: allBots ? undefined : {
                    create: (Array.isArray(botIds) ? botIds : []).map(id => ({ bot: { connect: { id: Number(id) } } }))
                }
            },
            include: { role: true, botAccess: true }
        });
        const { passwordHash, ...userToReturn } = newUser;
        res.status(201).json(userToReturn);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Пользователь с таким именем уже существует' });
        }
        res.status(500).json({ error: 'Не удалось создать пользователя' });
    }
});


/**
 * @route   GET /api/auth/roles
 * @desc    Получить все роли
 * @access  Private (Admin only)
 */
router.get('/roles', authenticate, authorize('panel:role:list'), async (req, res) => {
    try {
        const roles = await prisma.panelRole.findMany();
        const rolesWithParsedPermissions = roles.map(role => ({
            ...role,
            permissions: JSON.parse(role.permissions || '[]')
        }));
        res.json(rolesWithParsedPermissions);
    } catch (error) {
        res.status(500).json({ error: 'Не удалось получить роли' });
    }
});

const ALL_PERMISSIONS = [
    { id: '*', label: 'Все права (Администратор)' },
    { id: 'bot:list', label: 'Просмотр ботов' },
    { id: 'bot:create', label: 'Создание ботов' },
    { id: 'bot:update', label: 'Редактирование ботов' },
    { id: 'bot:delete', label: 'Удаление ботов' },
    { id: 'bot:start_stop', label: 'Запуск/остановка ботов' },
    { id: 'bot:interact', label: 'Взаимодействие с ботом (консоль)' },
    { id: 'bot:export', label: 'Экспорт ботов' },
    { id: 'bot:import', label: 'Импорт ботов' },
    { id: 'management:view', label: 'Просмотр вкладки "Управление" у бота' },
    { id: 'management:edit', label: 'Редактирование на вкладке "Управление" у бота' },
    { id: 'plugin:list', label: 'Просмотр плагинов' },
    { id: 'plugin:install', label: 'Установка плагинов' },
    { id: 'plugin:delete', label: 'Удаление плагинов' },
    { id: 'plugin:update', label: 'Обновление плагинов' },
    { id: 'plugin:settings:view', label: 'Просмотр настроек плагинов' },
    { id: 'plugin:settings:edit', label: 'Редактирование настроек плагинов' },
    { id: 'plugin:browse', label: 'Просмотр каталога плагинов' },
    { id: 'plugin:develop', label: 'Разработка и редактирование плагинов (IDE)' },
    { id: 'server:list', label: 'Просмотр серверов' },
    { id: 'server:create', label: 'Создание серверов' },
    { id: 'server:delete', label: 'Удаление серверов' },
    { id: 'task:list', label: 'Просмотр задач' },
    { id: 'task:create', label: 'Создание задач' },
    { id: 'task:edit', label: 'Редактирование задач' },
    { id: 'task:delete', label: 'Удаление задач' },
    { id: 'panel:user:list', label: 'Просмотр пользователей панели' },
    { id: 'panel:user:create', label: 'Создание пользователей панели' },
    { id: 'panel:user:edit', label: 'Редактирование пользователей панели' },
    { id: 'panel:user:delete', label: 'Удаление пользователей панели' },
    { id: 'panel:role:list', label: 'Просмотр ролей панели' },
    { id: 'panel:role:create', label: 'Создание ролей панели' },
    { id: 'panel:role:edit', label: 'Редактирование ролей панели' },
    { id: 'panel:role:delete', label: 'Удаление ролей панели' },
    { id: 'panel:settings:view', label: 'Просмотр глобальных настроек' },
    { id: 'panel:settings:edit', label: 'Редактирование глобальных настроек' },
    { id: 'graph:read', label: 'Просмотр магазина графов' },
    { id: 'graph:download', label: 'Скачивание графов из магазина' },
    { id: 'graph:like', label: 'Лайки графов в магазине' },
    { id: 'graph:publish', label: 'Публикация графов в магазин' },
];

const VIEWER_PERMISSIONS = [
    'bot:list',
    'plugin:list',
    'plugin:settings:view',
    'management:view',
    'server:list',
    'task:list',
    'graph:read',
];

/**
 * @route   GET /api/auth/permissions
 * @desc    Получить список всех возможных прав в системе
 * @access  Private
 */
router.get('/permissions', authenticate, (req, res) => {
    res.json(ALL_PERMISSIONS);
});


/**
 * @route   PUT /api/auth/users/:id
 * @desc    Обновить пользователя (роль, пароль)
 * @access  Private (Admin only)
 */
router.put('/users/:id', authenticate, ownerOnly, authorize('panel:user:edit'), async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { password, roleId, allBots, botIds } = req.body;

    try {
        const owner = await prisma.panelUser.findFirst({ orderBy: { id: 'asc' } });
        const isOwner = owner && owner.id === userId;

        const updateData = {};
        if (password) {
            if (password.length < 4) return res.status(400).json({ error: 'Пароль должен быть не менее 4 символов' });
            updateData.passwordHash = await bcrypt.hash(password, 12);
        }
        if (roleId) {
            updateData.roleId = parseInt(roleId, 10);
        }
        if (!isOwner && typeof allBots === 'boolean') {
            updateData.allBots = allBots;
        }

        const updatedUser = await prisma.panelUser.update({
            where: { id: userId },
            data: updateData,
            include: { role: true }
        });

        if (Array.isArray(botIds)) {
            await prisma.panelUserBotAccess.deleteMany({ where: { userId } });
            if (!isOwner && !updatedUser.allBots && botIds.length > 0) {
                await prisma.panelUserBotAccess.createMany({
                    data: botIds.map(id => ({ userId, botId: Number(id) }))
                });
            }
        }

        const { passwordHash, ...userToReturn } = updatedUser;
        res.json(userToReturn);

    } catch (error) {
        res.status(500).json({ error: 'Не удалось обновить пользователя' });
    }
});

/**
 * @route   DELETE /api/auth/users/:id
 * @desc    Удалить пользователя
 * @access  Private (Admin only)
 */
router.delete('/users/:id', authenticate, ownerOnly, authorize('panel:user:delete'), async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    
    if (req.user.userId === userId) {
        return res.status(403).json({ error: 'Вы не можете удалить свою собственную учетную запись.' });
    }

    try {
        const owner = await prisma.panelUser.findFirst({ orderBy: { id: 'asc' } });
        if (owner && owner.id === userId) {
            return res.status(403).json({ error: 'Нельзя удалить владельца системы.' });
        }
        await prisma.panelUser.delete({ where: { id: userId } });
        res.status(204).send();
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.status(500).json({ error: 'Не удалось удалить пользователя' });
    }
});

/**
 * @route   POST /api/auth/roles
 * @desc    Создать новую роль
 * @access  Private (Admin only)
 */
router.post('/roles', authenticate, ownerOnly, authorize('panel:role:create'), async (req, res) => {
    const { name, permissions } = req.body;
    if (!name || !Array.isArray(permissions)) {
        return res.status(400).json({ error: 'Имя и массив прав обязательны' });
    }
    try {
        const newRole = await prisma.panelRole.create({
            data: {
                name,
                permissions: JSON.stringify(permissions)
            }
        });
        res.status(201).json({
            ...newRole,
            permissions: JSON.parse(newRole.permissions)
        });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Роль с таким именем уже существует' });
        }
        res.status(500).json({ error: 'Не удалось создать роль' });
    }
});

/**
 * @route   PUT /api/auth/roles/:id
 * @desc    Обновить роль (имя и права)
 * @access  Private (Admin only)
 */
router.put('/roles/:id', authenticate, ownerOnly, authorize('panel:role:edit'), async (req, res) => {
    const roleId = parseInt(req.params.id, 10);
    const { name, permissions } = req.body;
    if (!name || !Array.isArray(permissions)) {
        return res.status(400).json({ error: 'Имя и массив прав обязательны' });
    }
    try {
        const role = await prisma.panelRole.findUnique({ where: { id: roleId } });
        if (role && role.name === 'Admin') {
            return res.status(403).json({ error: 'Редактирование роли "Admin" запрещено.' });
        }

        const updatedRole = await prisma.panelRole.update({
            where: { id: roleId },
            data: {
                name,
                permissions: JSON.stringify(permissions)
            }
        });
        res.json({
            ...updatedRole,
            permissions: JSON.parse(updatedRole.permissions)
        });
    } catch (error) {
         if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Роль с таким именем уже существует' });
        }
        res.status(500).json({ error: 'Не удалось обновить роль' });
    }
});

/**
 * @route   DELETE /api/auth/roles/:id
 * @desc    Удалить роль
 * @access  Private (Admin only)
 */
router.delete('/roles/:id', authenticate, ownerOnly, authorize('panel:role:delete'), async (req, res) => {
    const roleId = parseInt(req.params.id, 10);
    try {
        const role = await prisma.panelRole.findUnique({ where: { id: roleId }, include: { users: true } });
        if (!role) return res.status(404).json({ error: 'Роль не найдена' });
        if (role.name === 'Admin') {
            return res.status(403).json({ error: 'Удаление роли "Admin" запрещено.' });
        }
        if (role.users.length > 0) {
            return res.status(400).json({ error: 'Нельзя удалить роль, которая назначена пользователям.' });
        }
        await prisma.panelRole.delete({ where: { id: roleId } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Не удалось удалить роль' });
    }
});

module.exports = {
    router,
    ALL_PERMISSIONS,
    VIEWER_PERMISSIONS,
};