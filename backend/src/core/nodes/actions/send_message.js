/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с пина.
 * @param {function} helpers.traverse - Функция для перехода к следующему узлу.
 */
async function execute(node, context, helpers) {
    const { resolvePinValue, traverse } = helpers;

    let message = String(await resolvePinValue(node, 'message', ''));
    const chatType = await resolvePinValue(node, 'chat_type', context.typeChat);
    const recipient = await resolvePinValue(node, 'recipient', context.user?.username);

    // Парсим и заменяем переменные в формате {varName}
    const variablePattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const matches = [...message.matchAll(variablePattern)];

    for (const match of matches) {
        const varName = match[1];
        // Для динамических пинов, созданных на фронтенде, значение нужно будет получить, используя resolvePinValue
        const varValue = await resolvePinValue(node, `var_${varName}`, '');
        message = message.replace(match[0], String(varValue));
    }

    context.bot.sendMessage(chatType, message, recipient);
    await traverse(node, 'exec');
}

module.exports = {
    execute,
};
