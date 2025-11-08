/**
 * Нода для извлечения информации из объекта существа
 * @param {object} node - Экземпляр узла из графа.
 * @param {string} pinId - Идентификатор выходного пина, значение которого нужно вычислить.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с входного пина.
 * @returns {Promise<any>} - Вычисленное значение для выходного пина.
 */
async function evaluate(node, pinId, context, helpers) {
    const { resolvePinValue } = helpers;

    // Получаем объект существа из входного пина
    const entity = await resolvePinValue(node, 'entity');
    
    if (!entity) {
        // Возвращаем значения по умолчанию если существо не передано
        if (pinId === 'type') return null;
        if (pinId === 'username') return null;
        if (pinId === 'distance') return null;
        if (pinId === 'position') return null;
        if (pinId === 'id') return null;
        if (pinId === 'isPlayer') return false;
        return null;
    }

    // Возвращаем нужное поле в зависимости от запрошенного выходного пина
    switch (pinId) {
        case 'type':
            return entity.type || 'unknown';
        
        case 'username':
            // Для игроков - username, для остальных - displayName или type
            return entity.username || entity.displayName || entity.type || 'unknown';
        
        case 'distance':
            // Вычисляем расстояние от бота до существа
            if (entity.position && context.bot?.entity?.position) {
                const botPos = context.bot.entity.position;
                const entityPos = entity.position;
                
                const dx = entityPos.x - botPos.x;
                const dy = entityPos.y - botPos.y;
                const dz = entityPos.z - botPos.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                // Округляем до 2 знаков после запятой
                return Math.round(distance * 100) / 100;
            }
            return null;
        
        case 'position':
            return entity.position || null;
        
        case 'id':
            return entity.id || null;
        
        case 'isPlayer':
            return entity.type === 'player';
        
        default:
            return null;
    }
}

module.exports = {
    evaluate,
};

