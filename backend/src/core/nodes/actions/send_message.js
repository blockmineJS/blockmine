/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с пина.
 * @param {function} helpers.traverse - Функция для перехода к следующему узлу.
 */
async function execute(node, context, helpers) {
    const { resolvePinValue, traverse } = helpers;

    // resolvePinValue теперь автоматически заменяет {varName} на значения
    const message = String(await resolvePinValue(node, 'message', ''));
    const chatType = await resolvePinValue(node, 'chat_type', context.typeChat);
    const recipient = await resolvePinValue(node, 'recipient', context.user?.username);

    context.bot.sendMessage(chatType, message, recipient);
    await traverse(node, 'exec');
}

module.exports = {
    execute,
};
