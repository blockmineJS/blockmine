/**
 * Утилита для работы со скрытыми (секретными) значениями настроек плагинов
 * Позволяет маскировать чувствительные данные при отправке на фронтенд
 */

const SECRET_MASK = '********';

/**
 * Определяет, является ли настройка секретной
 * @param {Object} settingConfig - конфигурация настройки из manifest
 * @returns {boolean}
 */
function isSecretSetting(settingConfig) {
    if (!settingConfig) {
        return false;
    }
    return settingConfig.secret === true;
}

/**
 * Маскирует секретное значение
 * @param {any} value - значение для маскировки
 * @param {Object} settingConfig - конфигурация настройки
 * @returns {any} - замаскированное значение
 */
function maskSecretValue(value, settingConfig) {
    if (!isSecretSetting(settingConfig)) {
        return value;
    }

    // Если значение пустое/null/undefined, возвращаем как есть
    if (value === null || value === undefined || value === '') {
        return value;
    }

    // Для массивов маскируем каждый элемент
    if (Array.isArray(value)) {
        return value.map(() => SECRET_MASK);
    }

    // Для объектов маскируем каждое значение
    if (typeof value === 'object') {
        const masked = {};
        for (const key in value) {
            masked[key] = SECRET_MASK;
        }
        return masked;
    }

    // Для остальных типов просто возвращаем маску
    return SECRET_MASK;
}

/**
 * Фильтрует настройки плагина, маскируя секретные значения
 * @param {Object} settings - текущие настройки плагина
 * @param {Object} manifestSettings - описание настроек из manifest
 * @param {boolean} isGrouped - использует ли плагин группированные настройки
 * @returns {Object} - отфильтрованные настройки
 */
function filterSecretSettings(settings, manifestSettings, isGrouped = false) {
    if (!settings || !manifestSettings) {
        return settings;
    }

    const filteredSettings = { ...settings };

    if (isGrouped) {
        // Обработка группированных настроек
        for (const categoryKey in manifestSettings) {
            const categoryConfig = manifestSettings[categoryKey];
            if (typeof categoryConfig !== 'object' || !categoryConfig.label) {
                continue;
            }

            for (const settingKey in categoryConfig) {
                if (settingKey === 'label') continue;
                
                const settingConfig = categoryConfig[settingKey];
                if (isSecretSetting(settingConfig) && settingKey in filteredSettings) {
                    filteredSettings[settingKey] = maskSecretValue(
                        filteredSettings[settingKey],
                        settingConfig
                    );
                }
            }
        }
    } else {
        // Обработка обычных настроек
        for (const settingKey in manifestSettings) {
            const settingConfig = manifestSettings[settingKey];
            if (isSecretSetting(settingConfig) && settingKey in filteredSettings) {
                filteredSettings[settingKey] = maskSecretValue(
                    filteredSettings[settingKey],
                    settingConfig
                );
            }
        }
    }

    return filteredSettings;
}

/**
 * Проверяет, является ли значение замаскированным
 * @param {any} value - значение для проверки
 * @returns {boolean}
 */
function isMaskedValue(value) {
    if (value === SECRET_MASK) {
        return true;
    }

    if (Array.isArray(value)) {
        return value.every(item => item === SECRET_MASK);
    }

    if (typeof value === 'object' && value !== null) {
        return Object.values(value).every(v => v === SECRET_MASK);
    }

    return false;
}

/**
 * Фильтрует обновления настроек, удаляя замаскированные значения
 * Это предотвращает сохранение маски вместо реального значения
 * @param {Object} newSettings - новые настройки для сохранения
 * @param {Object} existingSettings - существующие настройки
 * @param {Object} manifestSettings - описание настроек из manifest
 * @param {boolean} isGrouped - использует ли плагин группированные настройки
 * @returns {Object} - отфильтрованные настройки для сохранения
 */
function prepareSettingsForSave(newSettings, existingSettings, manifestSettings, isGrouped = false) {
    if (!newSettings || !manifestSettings) {
        return newSettings;
    }

    const settingsToSave = { ...newSettings };

    if (isGrouped) {
        for (const categoryKey in manifestSettings) {
            const categoryConfig = manifestSettings[categoryKey];
            if (typeof categoryConfig !== 'object' || !categoryConfig.label) {
                continue;
            }

            for (const settingKey in categoryConfig) {
                if (settingKey === 'label') continue;
                
                const settingConfig = categoryConfig[settingKey];
                
                // Если настройка секретная и новое значение является маской,
                // используем существующее значение
                if (isSecretSetting(settingConfig) && 
                    settingKey in settingsToSave && 
                    isMaskedValue(settingsToSave[settingKey])) {
                    
                    if (existingSettings && settingKey in existingSettings) {
                        settingsToSave[settingKey] = existingSettings[settingKey];
                    } else {
                        // Если существующего значения нет, удаляем ключ
                        delete settingsToSave[settingKey];
                    }
                }
            }
        }
    } else {
        for (const settingKey in manifestSettings) {
            const settingConfig = manifestSettings[settingKey];
            
            if (isSecretSetting(settingConfig) && 
                settingKey in settingsToSave && 
                isMaskedValue(settingsToSave[settingKey])) {
                
                if (existingSettings && settingKey in existingSettings) {
                    settingsToSave[settingKey] = existingSettings[settingKey];
                } else {
                    delete settingsToSave[settingKey];
                }
            }
        }
    }

    return settingsToSave;
}

module.exports = {
    SECRET_MASK,
    isSecretSetting,
    maskSecretValue,
    filterSecretSettings,
    isMaskedValue,
    prepareSettingsForSave
};

