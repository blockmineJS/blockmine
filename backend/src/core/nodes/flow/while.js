const BreakLoopSignal = require('../../BreakLoopSignal');

/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с входного пина.
 * @param {function} helpers.traverse - Функция для перехода к следующему узлу.
 * @param {function} helpers.clearLoopBodyMemo - Функция для очистки мемоизации тела цикла.
 * @param {Map} helpers.memo - Map для хранения мемоизированных значений.
 */
async function execute(node, context, helpers) {
    const { resolvePinValue, traverse, clearLoopBodyMemo, memo } = helpers;

    let iteration = 0;
    const maxIterations = 1000;

    try {
        while (iteration < maxIterations) {
            const condition = await resolvePinValue(node, 'condition', false);
            if (!condition) break;

            memo.set(`${node.id}:iteration`, iteration);
            clearLoopBodyMemo(node);
            await traverse(node, 'loop_body');
            iteration++;
        }

        if (iteration >= maxIterations) {
            console.warn(`[GraphExecutionEngine] Цикл while достиг максимального количества итераций (${maxIterations})`);
        }
    } catch (e) {
        if (e instanceof BreakLoopSignal) {
            // Прерывание цикла - это нормально
        } else {
            throw e;
        }
    }

    await traverse(node, 'completed');
}

/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {string} pinId - Идентификатор выходного пина, значение которого нужно вычислить.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {Map} helpers.memo - Map для хранения мемоизированных значений.
 * @returns {Promise<any>} - Вычисленное значение для выходного пина.
 */
async function evaluate(node, pinId, context, helpers) {
    const { memo } = helpers;

    if (pinId === 'iteration') {
        return memo.get(`${node.id}:iteration`);
    }

    return null;
}

module.exports = {
    execute,
    evaluate,
};
