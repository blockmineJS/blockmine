/**
 * Глубокое объединение объектов настроек
 * @param {Object} defaultSettings - Настройки по умолчанию
 * @param {Object} savedSettings - Сохраненные настройки
 * @returns {Object} Объединенные настройки
 */
function deepMergeSettings(defaultSettings, savedSettings) {
    const result = { ...defaultSettings };
    
    for (const key in savedSettings) {
        if (savedSettings.hasOwnProperty(key)) {
            if (typeof savedSettings[key] === 'object' && savedSettings[key] !== null && !Array.isArray(savedSettings[key])) {
                // Если это объект, рекурсивно объединяем
                result[key] = deepMergeSettings(result[key] || {}, savedSettings[key]);
            } else {
                // Если это примитив или массив, просто заменяем
                result[key] = savedSettings[key];
            }
        }
    }
    
    return result;
}

module.exports = { deepMergeSettings }; 