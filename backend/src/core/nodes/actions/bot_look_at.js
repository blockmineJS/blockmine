/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с пина.
 * @param {function} helpers.traverse - Функция для перехода к следующему узлу.
 */
async function execute(node, context, helpers) {
    const { resolvePinValue, traverse } = helpers;

    const target = await resolvePinValue(node, 'target');
    const yOffset = await resolvePinValue(node, 'add_y', 0);

    if (target && context.bot?.lookAt) {
        let finalPosition;
        // Если цель - это сущность, у которой есть позиция
        if (target.position) {
            finalPosition = { ...target.position };
        }
        // Если цель - это объект с координатами
        else if (target.x !== undefined && target.y !== undefined && target.z !== undefined) {
            finalPosition = { ...target };
        }

        if (finalPosition) {
            finalPosition.y += Number(yOffset || 0);
            context.bot.lookAt(finalPosition);
        }
    }

    await traverse(node, 'exec');
}

module.exports = {
    execute,
};
