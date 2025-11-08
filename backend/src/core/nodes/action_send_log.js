/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с пина.
 * @param {function} helpers.traverse - Функция для перехода к следующему узлу.
 */
async function execute(node, context, helpers) {
    let message = await helpers.resolvePinValue(node, 'message', '');
    
    // Если сообщение - это объект или массив, форматируем как JSON
    if (typeof message === 'object' && message !== null) {
        message = JSON.stringify(message, null, 2);
    }
    
    if (this.botManager?.appendLog && context?.botId) {
        this.botManager.appendLog(context.botId, `[Graph] ${message}`);
    } else if (context?.bot?.sendLog) {
        context.bot.sendLog(`[Graph] ${message}`);
    } else {
        console.log(`[Graph Log] ${message}`);
    }

    await helpers.traverse(node, 'exec');
}

module.exports = {
    execute,
};