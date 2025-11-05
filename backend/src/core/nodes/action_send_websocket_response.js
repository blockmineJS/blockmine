/**
 * Нода: Отправить ответ в WebSocket
 * Отправляет данные обратно клиенту, вызвавшему граф через WebSocket API
 *
 * @param {object} node - Экземпляр узла из графа.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с пина.
 * @param {function} helpers.traverse - Функция для перехода к следующему узлу.
 */
async function execute(node, context, helpers) {
    const data = await helpers.resolvePinValue(node, 'data', null);

    // Проверяем, что граф был вызван через WebSocket API
    if (!context.sendResponse || typeof context.sendResponse !== 'function') {
        console.warn('[WebSocket Response] Нода может использоваться только в графах, вызванных через WebSocket API');
        await helpers.traverse(node, 'exec');
        return;
    }

    // Отправляем ответ клиенту
    try {
        context.sendResponse(data);
        console.log('[WebSocket Response] Ответ отправлен клиенту:', data);
    } catch (error) {
        console.error('[WebSocket Response] Ошибка отправки ответа:', error);
    }

    // Продолжаем выполнение графа
    await helpers.traverse(node, 'exec');
}

module.exports = { execute };
