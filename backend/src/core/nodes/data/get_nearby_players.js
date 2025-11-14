/**
 * Нода для получения списка игроков рядом с ботом с расстоянием до них
 * @param {object} node - Экземпляр узла из графа.
 * @param {string} pinId - Идентификатор выходного пина, значение которого нужно вычислить.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с входного пина.
 * @returns {Promise<any>} - Вычисленное значение для выходного пина.
 */
async function evaluate(node, pinId, context, helpers) {
    const { resolvePinValue } = helpers;

    if (pinId === 'players') {
        // Получаем радиус из входного пина (по умолчанию 32 блока)
        const radius = await resolvePinValue(node, 'radius', 32);

        // Получаем список всех существ через botApi
        if (context.bot && context.bot.getNearbyEntities) {
            const entities = await context.bot.getNearbyEntities(null, radius);
            
            // Фильтруем только игроков и добавляем расстояние
            const players = [];
            const botPosition = context.bot.entity?.position;
            
            for (const entity of entities) {
                // Только игроки (type === 'player')
                if (entity.type === 'player' && entity.position) {
                    let distance = null;
                    
                    // Вычисляем расстояние, если известна позиция бота
                    if (botPosition) {
                        const dx = entity.position.x - botPosition.x;
                        const dy = entity.position.y - botPosition.y;
                        const dz = entity.position.z - botPosition.z;
                        distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        // Округляем до 2 знаков после запятой
                        distance = Math.round(distance * 100) / 100;
                    }
                    
                    players.push({
                        username: entity.username,
                        distance: distance,
                        position: entity.position,
                        id: entity.id
                    });
                }
            }
            
            // Сортируем по расстоянию (ближайшие первыми)
            players.sort((a, b) => (a.distance || 0) - (b.distance || 0));
            
            return players;
        }

        return [];
    }

    return null;
}

module.exports = {
    evaluate,
};

