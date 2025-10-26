/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.traverse - Функция для перехода к следующему узлу.
 */
async function execute(node, context, helpers) {
    const pinCount = node.data?.pinCount || 2;
    for (let i = 0; i < pinCount; i++) {
        await helpers.traverse(node, `exec_${i}`);
    }
}

module.exports = {
    execute,
};
