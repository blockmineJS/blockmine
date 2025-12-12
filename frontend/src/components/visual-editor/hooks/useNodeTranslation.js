import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

/**
 * Hook для получения переводов нод
 *
 * Позволяет получать переведённые label, description и pin names
 * для нод визуального редактора
 */
export function useNodeTranslation() {
  const { t, i18n } = useTranslation('nodes');

  /**
   * Получает перевод для ноды
   * @param {string} nodeType - тип ноды (например, 'flow:branch')
   * @returns {object} - объект с переведёнными label и description
   */
  const getNodeTranslation = useCallback((nodeType) => {
    // Используем nsSeparator: false чтобы двоеточие в типе ноды не интерпретировалось как разделитель namespace
    const label = t(`${nodeType}.label`, { defaultValue: '', nsSeparator: false });
    const description = t(`${nodeType}.description`, { defaultValue: '', nsSeparator: false });

    return {
      label: label || undefined,
      description: description || undefined,
    };
  }, [t]);

  /**
   * Получает перевод для пина
   * @param {string} nodeType - тип ноды
   * @param {string} pinId - ID пина
   * @param {string} fallback - значение по умолчанию
   * @returns {string} - переведённое имя пина
   */
  const getPinName = useCallback((nodeType, pinId, fallback) => {
    // Сначала пробуем найти в pins конкретной ноды
    const nodePinName = t(`${nodeType}.pins.${pinId}`, { defaultValue: '', nsSeparator: false });
    if (nodePinName) return nodePinName;

    // Затем пробуем в common.pins
    const commonPinName = t(`common.pins.${pinId}`, { defaultValue: '', nsSeparator: false });
    if (commonPinName) return commonPinName;

    return fallback;
  }, [t]);

  /**
   * Получает описание для пина
   * @param {string} nodeType - тип ноды
   * @param {string} pinId - ID пина
   * @param {string} fallback - значение по умолчанию
   * @returns {string|undefined} - переведённое описание пина
   */
  const getPinDescription = useCallback((nodeType, pinId, fallback) => {
    const desc = t(`${nodeType}.pins.${pinId}_desc`, { defaultValue: '', nsSeparator: false });
    return desc || fallback;
  }, [t]);

  /**
   * Получает placeholder для пина
   * @param {string} nodeType - тип ноды
   * @param {string} pinId - ID пина
   * @param {string} fallback - значение по умолчанию
   * @returns {string} - переведённый placeholder
   */
  const getPlaceholder = useCallback((nodeType, pinId, fallback) => {
    // Сначала в placeholders конкретной ноды
    const nodePlaceholder = t(`${nodeType}.placeholders.${pinId}`, { defaultValue: '', nsSeparator: false });
    if (nodePlaceholder) return nodePlaceholder;

    // Затем в common.placeholders
    const commonPlaceholder = t(`common.placeholders.${pinId}`, { defaultValue: '', nsSeparator: false });
    if (commonPlaceholder) return commonPlaceholder;

    return fallback;
  }, [t]);

  /**
   * Переводит полную ноду (label, description, все pins)
   * @param {object} nodeDefinition - определение ноды
   * @returns {object} - ноду с переведёнными полями
   */
  const translateNode = useCallback((nodeDefinition, data = {}, context = {}) => {
    if (!nodeDefinition) return nodeDefinition;

    const nodeType = nodeDefinition.type;
    const translation = getNodeTranslation(nodeType);

    // Переводим входы
    const translatePins = (pins) => {
      if (!pins || !Array.isArray(pins)) return pins;
      return pins.map(pin => ({
        ...pin,
        name: getPinName(nodeType, pin.id, pin.name),
        description: getPinDescription(nodeType, pin.id, pin.description),
        placeholder: pin.placeholder ? getPlaceholder(nodeType, pin.id, pin.placeholder) : pin.placeholder,
      }));
    };

    return {
      ...nodeDefinition,
      label: translation.label || nodeDefinition.label,
      description: translation.description || nodeDefinition.description,
      getTranslatedInputs: (data, ctx) => translatePins(nodeDefinition.getInputs?.(data, ctx) || []),
      getTranslatedOutputs: (data, ctx) => translatePins(nodeDefinition.getOutputs?.(data, ctx) || []),
    };
  }, [getNodeTranslation, getPinName, getPinDescription, getPlaceholder]);

  return {
    t,
    i18n,
    getNodeTranslation,
    getPinName,
    getPinDescription,
    getPlaceholder,
    translateNode,
  };
}

export default useNodeTranslation;
