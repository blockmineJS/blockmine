const BreakLoopSignal = require('../../BreakLoopSignal');

/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 */
async function execute(node, context, helpers) {
    throw new BreakLoopSignal();
}

module.exports = {
    execute,
};
