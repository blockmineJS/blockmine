/**
 * Определяет, должно ли поле настройки плагина отображаться
 * на основе условий (например, actionsPreset)
 *
 * @param {string} key - Ключ поля настройки
 * @param {any} actionsPresetValue - Значение поля actionsPreset (если есть)
 * @returns {boolean} - Должно ли поле отображаться
 */
export const shouldShowField = (key, actionsPresetValue) => {
    // Если есть поле actionsPreset, то поля enable* показываем только при custom
    if (actionsPresetValue !== undefined && key.startsWith('enable')) {
        return actionsPresetValue === 'custom';
    }
    return true;
};
