const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

const objectsNodes = [
  {
    type: 'object:create',
    label: '🏗️ Создать объект',
    category: 'Объект',
    description: 'Создает объект из пар ключ-значение.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/objects/create').evaluate,
    computeInputs: () => [],
    computeOutputs: () => [
      { id: 'object', name: 'Объект', type: 'Object' }
    ],
    defaultData: {},
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  },
  {
    type: 'object:get',
    label: '📤 Получить значение',
    category: 'Объект',
    description: 'Получает значение по ключу из объекта.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/objects/get').evaluate,
    computeInputs: (data) => [
      { id: 'object', name: 'Объект', type: 'Object', required: true },
      { id: 'key', name: 'Ключ', type: 'String', required: true, inlineField: true, placeholder: 'key...' }
    ],
    computeOutputs: () => [
      { id: 'value', name: 'Значение', type: 'Any' }
    ],
    defaultData: { key: '' },
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  },
  {
    type: 'object:set',
    label: '➕ Добавить/Изменить ключ',
    category: 'Объект',
    description: 'Добавляет или изменяет значение по ключу в объекте.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/objects/set').evaluate,
    computeInputs: (data) => [
      { id: 'object', name: 'Объект', type: 'Object', required: true },
      { id: 'key', name: 'Ключ', type: 'String', required: true, inlineField: true, placeholder: 'key...' },
      { id: 'value', name: 'Значение', type: 'Any', required: true }
    ],
    computeOutputs: () => [
      { id: 'new_object', name: 'Новый объект', type: 'Object' }
    ],
    defaultData: { key: '' },
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  },
  {
    type: 'object:delete',
    label: '➖ Удалить ключ',
    category: 'Объект',
    description: 'Удаляет ключ из объекта.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/objects/delete').evaluate,
    computeInputs: (data) => [
      { id: 'object', name: 'Объект', type: 'Object', required: true },
      { id: 'key', name: 'Ключ', type: 'String', required: true, inlineField: true, placeholder: 'key...' }
    ],
    computeOutputs: () => [
      { id: 'new_object', name: 'Новый объект', type: 'Object' }
    ],
    defaultData: { key: '' },
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  },
  {
    type: 'object:has_key',
    label: '🔍 Проверить ключ',
    category: 'Объект',
    description: 'Проверяет наличие ключа в объекте и возвращает значение.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/objects/has_key').evaluate,
    computeInputs: (data) => [
      { id: 'object', name: 'Объект', type: 'Object', required: true },
      { id: 'key', name: 'Ключ', type: 'String', required: true, inlineField: true, placeholder: 'key...' }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Найден', type: 'Boolean' },
      { id: 'value', name: 'Значение', type: 'Any' }
    ],
    defaultData: { key: '' },
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  }
];

module.exports = objectsNodes;