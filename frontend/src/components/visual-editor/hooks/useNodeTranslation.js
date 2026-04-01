import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

const toLegacyNodeTranslationKey = (nodeType) => {
  if (!nodeType) return nodeType;

  return String(nodeType)
    .split(':')
    .map((segment, index) => {
      if (index === 0) return segment;
      return segment.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    })
    .join(':');
};

const buildNodeTypeKeys = (nodeType) => {
  const exactKey = String(nodeType || '');
  const legacyKey = toLegacyNodeTranslationKey(exactKey);
  return legacyKey !== exactKey ? [exactKey, legacyKey] : [exactKey];
};

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
    const keys = buildNodeTypeKeys(nodeType);
    let label = '';
    let description = '';

    for (const key of keys) {
      label = t(`${key}.label`, { defaultValue: '', nsSeparator: false });
      if (label) break;
    }

    for (const key of keys) {
      description = t(`${key}.description`, { defaultValue: '', nsSeparator: false });
      if (description) break;
    }

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
    for (const key of buildNodeTypeKeys(nodeType)) {
      const nodePinName = t(`${key}.pins.${pinId}`, { defaultValue: '', nsSeparator: false });
      if (nodePinName) return nodePinName;
    }

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
    for (const key of buildNodeTypeKeys(nodeType)) {
      const desc = t(`${key}.pins.${pinId}_desc`, { defaultValue: '', nsSeparator: false });
      if (desc) return desc;
    }

    return fallback;
  }, [t]);

  /**
   * Получает placeholder для пина
   * @param {string} nodeType - тип ноды
   * @param {string} pinId - ID пина
   * @param {string} fallback - значение по умолчанию
   * @returns {string} - переведённый placeholder
   */
  const getPlaceholder = useCallback((nodeType, pinId, fallback) => {
    for (const key of buildNodeTypeKeys(nodeType)) {
      const nodePlaceholder = t(`${key}.placeholders.${pinId}`, { defaultValue: '', nsSeparator: false });
      if (nodePlaceholder) return nodePlaceholder;
    }

    // Затем в common.placeholders
    const commonPlaceholder = t(`common.placeholders.${pinId}`, { defaultValue: '', nsSeparator: false });
    if (commonPlaceholder) return commonPlaceholder;

    return fallback;
  }, [t]);

  const getInlineOptionLabel = useCallback((nodeType, pinId, optionValue, fallback) => {
    for (const key of buildNodeTypeKeys(nodeType)) {
      const optionLabel = t(`${key}.options.${pinId}.${String(optionValue)}`, { defaultValue: '', nsSeparator: false });
      if (optionLabel) return optionLabel;
    }

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
        inlineFieldOptions: Array.isArray(pin.inlineFieldOptions)
          ? pin.inlineFieldOptions.map((option) => ({
              ...option,
              label: getInlineOptionLabel(nodeType, pin.id, option.value, option.label),
            }))
          : pin.inlineFieldOptions,
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
    getInlineOptionLabel,
    translateNode,
  };
}

export default useNodeTranslation;
