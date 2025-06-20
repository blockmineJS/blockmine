const jwt = require('jsonwebtoken');
const config = require('../../config');

const JWT_SECRET = config.security.jwtSecret;

const tokenCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;


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

    if (tokenCache.has(token)) {
        const cached = tokenCache.get(token);
        if (Date.now() < cached.expires) {
            req.user = cached.payload;
            return next();
        } else {
            tokenCache.delete(token);
        }
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        req.user = decoded;
        
        tokenCache.set(token, {
            payload: decoded,
            expires: Date.now() + CACHE_TTL
        });

        next();
    } catch (err) {
        res.status(401).json({ error: 'Невалидный токен' });
    }
}


function authorize(requiredPermission) {
    return (req, res, next) => {
        if (!req.user || !Array.isArray(req.user.permissions)) {
            return res.status(403).json({ error: 'Ошибка прав доступа: пользователь не аутентифицирован или формат прав некорректен.' });
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