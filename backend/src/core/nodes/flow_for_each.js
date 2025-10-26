const BreakLoopSignal = require('../BreakLoopSignal');

/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с пина.
 * @param {function} helpers.traverse - Функция для перехода к следующему узлу.
 * @param {Map} helpers.memo - Карта для мемоизации значений в рамках одного выполнения графа.
 * @param {function} helpers.clearLoopBodyMemo - Функция для очистки мемоизации внутри тела цикла.
 */
async function execute(node, context, helpers) {
    const { resolvePinValue, traverse, memo, clearLoopBodyMemo } = helpers;

    const array = await resolvePinValue(node, 'array', []);
    if (Array.isArray(array)) {
        try {
            for (let i = 0; i < array.length; i++) {
                const element = array[i];
                memo.set(`${node.id}:element`, element);
                memo.set(`${node.id}:index`, i);
                clearLoopBodyMemo(node);
                await traverse(node, 'loop_body');
            }
        } catch (e) {
            if (e instanceof BreakLoopSignal) {
                // Цикл был прерван узлом Break, это ожидаемое поведение.
            } else {
                // Перебрасываем другие, неожиданные ошибки.
                throw e;
            }
        }
    }
    await traverse(node, 'completed');
}

module.exports = {
    execute,
};
