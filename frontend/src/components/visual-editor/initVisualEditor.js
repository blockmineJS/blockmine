/**
 * Инициализация визуального редактора
 * Регистрирует все доступные типы нод перед использованием редактора
 */

import { registerAllNodes } from './nodes';

let initialized = false;

/**
 * Инициализирует визуальный редактор
 * Вызывать один раз при загрузке приложения
 */
export function initializeVisualEditor() {
  if (initialized) {
    console.warn('[VisualEditor] Already initialized');
    return;
  }

  console.log('[VisualEditor] Initializing...');

  // Регистрируем все ноды
  registerAllNodes();

  initialized = true;
  console.log('[VisualEditor] Initialization complete');
}

export default initializeVisualEditor;
