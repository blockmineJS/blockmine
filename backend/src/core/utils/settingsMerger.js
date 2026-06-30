/**
 * Глубокое объединение объектов настроек
 * @param {Object} defaultSettings - Настройки по умолчанию
 * @param {Object} savedSettings - Сохраненные настройки
 * @returns {Object} Объединенные настройки
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function deepMergeSettings(defaultSettings, savedSettings) {
    const result = { ...defaultSettings };

    for (const key in savedSettings) {
        if (!Object.prototype.hasOwnProperty.call(savedSettings, key)) continue;
        if (FORBIDDEN_KEYS.has(key)) continue;

        if (typeof savedSettings[key] === 'object' && savedSettings[key] !== null && !Array.isArray(savedSettings[key])) {
            result[key] = deepMergeSettings(result[key] || {}, savedSettings[key]);
        } else {
            result[key] = savedSettings[key];
        }
    }

    return result;
}

module.exports = { deepMergeSettings }; 