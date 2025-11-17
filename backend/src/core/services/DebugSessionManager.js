const { randomUUID } = require('crypto');

/**
 * Состояние отладки для конкретного графа
 * Shared state между всеми подключенными пользователями
 */
class GraphDebugState {
  constructor(botId, graphId, io) {
    this.botId = botId;
    this.graphId = graphId;
    this.io = io;

    // Общие брейкпоинты (видят все пользователи)
    this.breakpoints = new Map(); // Map<nodeId, Breakpoint>

    // Текущая активная сессия выполнения (если граф выполняется)
    this.activeExecution = null;

    // Подключенные пользователи
    this.connectedUsers = new Map(); // Map<socketId, {userId, username}>

    // Для управления паузой выполнения
    this.pausePromise = null;
    this.resumeCallback = null;
  }

  /**
   * Получить имя комнаты для этого графа
   */
  getRoomName() {
    return `graph:${this.graphId}:debug`;
  }

  /**
   * Broadcast событие всем подключенным пользователям
   */
  broadcast(event, data) {
    this.io.to(this.getRoomName()).emit(event, data);
  }

  /**
   * Приостановить выполнение графа
   * Возвращает Promise, который разрешится когда пользователь нажмет Continue
   */
  async pause(state) {
    // Генерируем sessionId для этой паузы
    const sessionId = randomUUID();

    this.activeExecution = {
      sessionId,
      ...state,
      pausedAt: Date.now()
    };

    this.broadcast('debug:paused', {
      sessionId,
      ...state
    });

    // Создаем Promise, который будет ждать resume
    this.pausePromise = new Promise((resolve) => {
      this.resumeCallback = resolve;
    });

    // Ждем пока кто-то не вызовет resume
    const overrides = await this.pausePromise;

    return overrides;
  }

  /**
   * Возобновить выполнение
   */
  resume(overrides = null) {
    if (this.resumeCallback) {
      this.resumeCallback(overrides);
      this.resumeCallback = null;
      this.pausePromise = null;
    }

    this.activeExecution = null;

    this.broadcast('debug:resumed', {});
  }

  /**
   * Остановить выполнение (форсированно)
   */
  stop() {
    if (this.resumeCallback) {
      this.resumeCallback({ __stopped: true });
      this.resumeCallback = null;
      this.pausePromise = null;
    }

    this.activeExecution = null;

    this.broadcast('debug:stopped', {});
  }

  /**
   * Добавить брейкпоинт
   */
  addBreakpoint(nodeId, condition, createdBy) {
    const breakpoint = {
      id: randomUUID(),
      nodeId,
      condition: condition || null,
      enabled: true,
      hitCount: 0,
      createdBy,
      createdAt: Date.now()
    };

    this.breakpoints.set(nodeId, breakpoint);

    this.broadcast('debug:breakpoint-added', { breakpoint });

    return breakpoint;
  }

  /**
   * Удалить брейкпоинт
   */
  removeBreakpoint(nodeId) {
    this.breakpoints.delete(nodeId);
    this.broadcast('debug:breakpoint-removed', { nodeId });
  }

  /**
   * Переключить enabled для брейкпоинта
   */
  toggleBreakpoint(nodeId, enabled) {
    const bp = this.breakpoints.get(nodeId);
    if (bp) {
      bp.enabled = enabled;
      this.broadcast('debug:breakpoint-toggled', { nodeId, enabled });
    }
  }

  /**
   * Получить текущее состояние (для отправки новым пользователям)
   */
  getState() {
    return {
      breakpoints: Array.from(this.breakpoints.values()),
      activeExecution: this.activeExecution,
      connectedUsers: Array.from(this.connectedUsers.values())
    };
  }

  /**
   * Добавить пользователя
   */
  addUser(socketId, userInfo) {
    this.connectedUsers.set(socketId, userInfo);
  }

  /**
   * Удалить пользователя
   */
  removeUser(socketId) {
    this.connectedUsers.delete(socketId);
  }
}

/**
 * Менеджер отладочных сессий
 * Управляет состоянием отладки для всех графов (в памяти)
 */
class DebugSessionManager {
  constructor(io) {
    this.io = io;

    // Map<graphId, GraphDebugState>
    this.graphDebugStates = new Map();

    console.log('[DebugSessionManager] Initialized');
  }

  /**
   * Получить или создать состояние отладки для графа
   */
  getOrCreate(botId, graphId) {
    if (!this.graphDebugStates.has(graphId)) {
      const state = new GraphDebugState(botId, graphId, this.io);
      this.graphDebugStates.set(graphId, state);
      console.log(`[DebugSessionManager] Created debug state for graph ${graphId}`);
    }

    return this.graphDebugStates.get(graphId);
  }

  /**
   * Получить состояние отладки для графа (если существует)
   */
  get(graphId) {
    return this.graphDebugStates.get(graphId);
  }

  /**
   * Найти состояние по sessionId
   */
  getBySessionId(sessionId) {
    for (const state of this.graphDebugStates.values()) {
      if (state.activeExecution && state.activeExecution.sessionId === sessionId) {
        return state;
      }
    }
    return null;
  }

  /**
   * Удалить состояние графа (при необходимости)
   */
  remove(graphId) {
    this.graphDebugStates.delete(graphId);
    console.log(`[DebugSessionManager] Removed debug state for graph ${graphId}`);
  }

  /**
   * Очистить все состояния (при перезапуске бота)
   */
  clearAll() {
    this.graphDebugStates.clear();
    console.log('[DebugSessionManager] Cleared all debug states');
  }

  /**
   * Очистить состояния для конкретного бота
   */
  clearForBot(botId) {
    for (const [graphId, state] of this.graphDebugStates.entries()) {
      if (state.botId === botId) {
        this.graphDebugStates.delete(graphId);
      }
    }
    console.log(`[DebugSessionManager] Cleared debug states for bot ${botId}`);
  }
}

// Глобальный инстанс для предотвращения циклических зависимостей
let globalDebugManager = null;

/**
 * Инициализировать глобальный инстанс DebugSessionManager
 */
function initializeDebugManager(io) {
  if (!globalDebugManager) {
    globalDebugManager = new DebugSessionManager(io);
    console.log('[DebugSessionManager] Global instance initialized');
  }
  return globalDebugManager;
}

/**
 * Получить глобальный инстанс DebugSessionManager
 */
function getGlobalDebugManager() {
  if (!globalDebugManager) {
    throw new Error('DebugSessionManager not initialized! Call initializeDebugManager(io) first.');
  }
  return globalDebugManager;
}

module.exports = DebugSessionManager;
module.exports.initializeDebugManager = initializeDebugManager;
module.exports.getGlobalDebugManager = getGlobalDebugManager;
