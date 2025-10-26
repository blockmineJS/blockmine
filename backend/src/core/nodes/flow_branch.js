/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с пина.
 * @param {function} helpers.traverse - Функция для перехода к следующему узлу.
 */
async function execute(node, context, helpers) {
    const condition = await helpers.resolvePinValue(node, 'condition', false);
    await helpers.traverse(node, condition ? 'exec_true' : 'exec_false');
}

module.exports = {
    execute,
};
