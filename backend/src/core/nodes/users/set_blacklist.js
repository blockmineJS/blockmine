const User = require('../../UserService');
const prismaService = require('../../PrismaService');
const { tryGraphWrite, graphUser } = require('../../graphServices');
const prisma = prismaService.getClient();

/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с пина.
 * @param {function} helpers.traverse - Функция для перехода к следующему узлу.
 * @param {Map} helpers.memo - Карта для мемоизации значений.
 */
async function execute(node, context, helpers) {
    const { resolvePinValue, traverse, memo } = helpers;

    const userObject = await resolvePinValue(node, 'user', null);
    const blacklistStatus = await resolvePinValue(node, 'blacklist_status', false);
    let updatedUser = null;
    
    if (userObject && userObject.username) {
        const isolated = await tryGraphWrite(context, 'set_blacklist', `${userObject.username}=${Boolean(blacklistStatus)}`, {
            username: userObject.username,
            status: blacklistStatus,
        });
        if (isolated?.handled) {
            memo.set(`${node.id}:updated_user`, await graphUser(context, userObject.username));
            await traverse(node, 'exec');
            return;
        }
        const user = await graphUser(context, userObject.username);
        if (user) {
            updatedUser = await prisma.user.update({
                where: { id: user.id },
                data: { isBlacklisted: blacklistStatus }
            });
            User.clearCache(userObject.username, context.botId);
        }
    }
    
    memo.set(`${node.id}:updated_user`, updatedUser);
    await traverse(node, 'exec');
}

module.exports = {
    execute,
};
