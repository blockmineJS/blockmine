
const jwt = require('jsonwebtoken');
const config = require('../../config');

const JWT_SECRET = config.security.jwtSecret;

/**
 * Middleware для проверки JWT-токена.
 * Извлекает токен из заголовка Authorization, проверяет его подлинность
 * и добавляет расшифрованные данные (payload) в req.user.
 */
function authenticate(req, res, next) {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ error: 'Нет токена, доступ запрещен' });
    }
    
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Неверный формат токена' });
    }

    const token = tokenParts[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Невалидный токен' });
    }
}

/**
 * Middleware-фабрика для проверки прав доступа.
 * @param {string} requiredPermission - Право, необходимое для доступа к роуту (например, 'bot:delete').
 * @returns {function} - Express middleware.
 */
function authorize(requiredPermission) {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions) {
            return res.status(403).json({ error: 'Ошибка прав доступа: пользователь не аутентифицирован.' });
        }

        const userPermissions = req.user.permissions;

        if (userPermissions.includes('*') || userPermissions.includes(requiredPermission)) {
            next();
        } else {
            res.status(403).json({ error: 'Доступ запрещен: недостаточно прав.' });
        }
    };
}

module.exports = {
    authenticate,
    authorize,
};