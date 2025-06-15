
const userCache = new Map();

function getUser(username, botId, botConfig) {
    const cacheKey = `${botId}:${username.toLowerCase()}`;
    if (userCache.has(cacheKey)) {
        return userCache.get(cacheKey);
    }
    
    const tempUser = {
        username: username.toLowerCase(),
        isOwner: (botConfig.owners || '').toLowerCase().split(',').includes(username.toLowerCase()),
        hasPermission: () => true,
        hasGroup: () => false,
    };
    userCache.set(cacheKey, tempUser);
    return tempUser;
}

function clearCache(username, botId) {
    const cacheKey = `${botId}:${username.toLowerCase()}`;
    userCache.delete(cacheKey);
    if (process.send) {
        process.send({ type: 'invalidate_user_cache_main', username, botId });
    }
}

module.exports = {
    getUser,
    clearCache
};