/**
 * Тема и конфигурация визуального редактора графов
 *
 * Этот файл содержит все настройки внешнего вида редактора:
 * - Цвета типов данных (пинов)
 * - Стили нод
 * - Размеры и отступы
 * - Цветовая схема
 */

// ============================================================================
// ЦВЕТА ТИПОВ ДАННЫХ (ПИНОВ)
// ============================================================================
export const pinColors = {
  Exec: '#ffffff',      // Белый - для управляющих пинов
  Boolean: '#dc2626',   // Красный - булевы значения
  String: '#db2777',    // Розовый - строки
  Number: '#2563eb',    // Синий - числа
  User: '#f59e0b',      // Оранжевый - пользовательские данные
  Array: '#3b82f6',     // Светло-синий - массивы
  Wildcard: '#6b7280',  // Серый - универсальный тип
  Object: '#9333ea',    // Фиолетовый - объекты
};

// ============================================================================
// СТИЛИ НОД
// ============================================================================
export const nodeStyles = {
  // Основной стиль ноды
  base: {
    minWidth: '200px',
    backgroundColor: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '0',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    fontFamily: 'Arial, sans-serif',
  },

  // Стиль для выбранной ноды
  selected: {
    border: '2px solid #2196F3',
    boxShadow: '0 0 0 2px rgba(33, 150, 243, 0.3)',
  },

  // Заголовок ноды
  header: {
    backgroundColor: '#2d2d2d',
    padding: '8px 12px',
    borderBottom: '1px solid #333',
    borderRadius: '8px 8px 0 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Название ноды
  title: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 'bold',
    margin: '0',
  },

  // Кнопка удаления
  deleteButton: {
    background: 'none',
    border: 'none',
    color: '#ff4444',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Контейнер для контента ноды
  content: {
    padding: '12px',
  },

  // Описание ноды
  description: {
    color: '#999',
    fontSize: '12px',
    marginBottom: '8px',
  },
};

// ============================================================================
// СТИЛИ ПИНОВ
// ============================================================================
export const pinStyles = {
  // Контейнер пина
  container: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '6px',
    fontSize: '12px',
    color: '#ccc',
  },

  // Лейбл пина
  label: {
    marginLeft: '6px',
    marginRight: '6px',
  },

  // Точка подключения (handle)
  handle: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: '2px solid #1e1e1e',
    backgroundColor: '#999',
  },

  // Точка подключения с соединением
  handleConnected: {
    // Цвет берется из pinColors в зависимости от типа
    border: '2px solid #1e1e1e',
  },
};

// ============================================================================
// РАЗМЕРЫ И ОТСТУПЫ
// ============================================================================
export const dimensions = {
  // Минимальная ширина ноды
  nodeMinWidth: '200px',

  // Размер пина
  pinSize: '10px',

  // Отступы
  nodePadding: '12px',
  headerPadding: '8px 12px',
  pinMargin: '6px',

  // Скругления
  borderRadius: '8px',
  handleRadius: '50%',
};

// ============================================================================
// ЦВЕТОВАЯ СХЕМА РЕДАКТОРА
// ============================================================================
export const editorColors = {
  // Фон
  background: '#0f0f0f',

  // Сетка
  gridLine: '#1a1a1a',
  gridDot: '#333',

  // Нода
  nodeBackground: '#1e1e1e',
  nodeBorder: '#333',
  nodeHeader: '#2d2d2d',

  // Текст
  textPrimary: '#ffffff',
  textSecondary: '#ccc',
  textMuted: '#999',

  // Акценты
  accent: '#2196F3',
  danger: '#ff4444',

  // Соединения
  edgeDefault: '#555',
  edgeSelected: '#2196F3',
};

// ============================================================================
// НАСТРОЙКИ REACT FLOW
// ============================================================================
export const reactFlowConfig = {
  // Стили фона
  background: {
    color: editorColors.background,
    gap: 16,
    size: 1,
  },

  // Настройки edge
  edge: {
    type: 'smoothstep',
    style: {
      stroke: editorColors.edgeDefault,
      strokeWidth: 2,
    },
    animated: false,
  },

  // Настройки minimap (если используется)
  minimap: {
    nodeColor: nodeStyles.base.backgroundColor,
    maskColor: 'rgba(0, 0, 0, 0.5)',
  },
};

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Получить цвет для типа данных
 * @param {string} type - тип данных
 * @returns {string} цвет в формате hex
 */
export const getPinColor = (type) => {
  return pinColors[type] || pinColors.any;
};

/**
 * Получить стиль для ноды
 * @param {boolean} selected - выбрана ли нода
 * @returns {object} объект стилей
 */
export const getNodeStyle = (selected) => {
  return selected
    ? { ...nodeStyles.base, ...nodeStyles.selected }
    : nodeStyles.base;
};

/**
 * Получить стиль для пина
 * @param {string} type - тип данных
 * @param {boolean} hasConnection - есть ли подключение
 * @returns {object} объект стилей
 */
export const getPinHandleStyle = (type, hasConnection) => {
  const baseStyle = { ...pinStyles.handle };

  if (hasConnection) {
    baseStyle.backgroundColor = getPinColor(type);
    return { ...baseStyle, ...pinStyles.handleConnected };
  }

  return baseStyle;
};
