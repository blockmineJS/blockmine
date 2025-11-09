/**
 * Узел задержки выполнения.
 *
 * Логика:
 * - Ждет указанное количество миллисекунд.
 * - После ожидания продолжает выполнение по выходу exec.
 *
 * Использование в графе:
 * - Вход exec подключается от предыдущего действия.
 * - Вход delay (Number) можно задать константой или подать с другого узла.
 * - Выход exec соединяется с следующим действием.
 */

/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с входного пина.
 * @param {function} helpers.traverse - Функция для перехода к следующему узлу.
 */
async function execute(node, context, helpers) {
    const { resolvePinValue, traverse } = helpers;

    // Значение задержки в миллисекундах.
    // Можно задать как data.delay в ноде, либо через входной пин delay.
    let delayMs = await resolvePinValue(node, 'delay', node.data?.delay ?? 0);

    // Нормализуем значение
    delayMs = Number(delayMs);
    if (!Number.isFinite(delayMs) || delayMs < 0) {
        delayMs = 0;
    }

    if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    await traverse(node, 'exec');
}

module.exports = {
    execute,
};