/**
 * Проверяет, должно ли поле быть показано, основываясь на зависимостях dependsOn
 * @param {string} key - Ключ настройки
 * @param {Object} config - Конфигурация поля из manifest
 * @param {Object} allSettings - Все текущие значения настроек
 * @returns {boolean} - true, если поле должно быть показано
 */
export function shouldShowField(key, config, allSettings) {
  // Старая логика для обратной совместимости с actionsPreset
  if (allSettings?.actionsPreset !== undefined && key.startsWith('enable')) {
    return allSettings.actionsPreset === 'custom';
  }

  // Если нет dependsOn, показываем поле
  if (!config.dependsOn) return true;

  // Преобразуем dependsOn в массив условий для единообразной обработки
  const conditions = Array.isArray(config.dependsOn)
    ? config.dependsOn
    : [config.dependsOn];

  // Все условия должны быть выполнены (AND логика)
  return conditions.every(condition => {
    const fieldValue = allSettings?.[condition.field];
    const targetValue = condition.value;
    const operator = condition.operator || 'eq';

    let result;

    // Если targetValue - массив, проверяем, входит ли текущее значение в него
    if (Array.isArray(targetValue)) {
      result = targetValue.includes(fieldValue);
    } else {
      // Проверка по оператору
      switch (operator) {
        case 'eq':  // равно (по умолчанию)
          result = fieldValue === targetValue;
          break;
        case 'ne':  // не равно
          result = fieldValue !== targetValue;
          break;
        case 'gt':  // больше
          result = fieldValue > targetValue;
          break;
        case 'gte': // больше или равно
          result = fieldValue >= targetValue;
          break;
        case 'lt':  // меньше
          result = fieldValue < targetValue;
          break;
        case 'lte': // меньше или равно
          result = fieldValue <= targetValue;
          break;
        default:
          result = fieldValue === targetValue;
      }
    }

    // Инвертируем результат, если указан флаг invert (NOT логика)
    return condition.invert ? !result : result;
  });
}
