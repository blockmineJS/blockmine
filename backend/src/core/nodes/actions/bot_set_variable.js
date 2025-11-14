/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с пина.
 * @param {function} helpers.traverse - Функция для перехода к следующему узлу.
 */
async function execute(node, context, helpers) {
    const { resolvePinValue, traverse } = helpers;

    const varName = await resolvePinValue(node, 'name', '');
    const varValue = await resolvePinValue(node, 'value');
    let shouldPersist = await resolvePinValue(node, 'persist', false);

    // В графах команд принудительно отключаем сохранение в БД, чтобы избежать случайных записей
    if (context.eventType === 'command') {
        shouldPersist = false;
    }

    if (varName) {
        context.variables[varName] = varValue;
        if (context.persistenceIntent) {
          context.persistenceIntent.set(varName, shouldPersist);
        }
    }

    await traverse(node, 'exec');
}

module.exports = {
    execute,
};
