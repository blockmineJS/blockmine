/**
 * Конфигурация для Live Debug системы
 */

module.exports = {
    // Таймауты (в миллисекундах)
    BREAKPOINT_TIMEOUT: 30000,        // 30 секунд - максимальное время ожидания breakpoint response
    STEP_MODE_TIMEOUT: 30000,         // 30 секунд - максимальное время ожидания step mode response
    TRACE_CLEANUP_DELAY: 5000,        // 5 секунд - задержка перед удалением completed trace

    // Лимиты
    MAX_TRACE_STEPS: 10000,           // Максимальное количество шагов в одном trace
    MAX_COMPLETED_TRACES: 100,        // Максимальное количество хранимых completed traces
    MAX_OUTPUT_LENGTH: 30000,         // Максимальная длина output при передаче через IPC

    // IPC Message Types (для type safety)
    IPC_TYPES: {
        EXECUTE_EVENT_GRAPH: 'execute_event_graph',
        EXECUTE_HANDLER: 'execute_handler',
        EXECUTE_COMMAND_REQUEST: 'execute_command_request',

        DEBUG_CHECK_BREAKPOINT: 'debug:check_breakpoint',
        DEBUG_CHECK_STEP_MODE: 'debug:check_step_mode',
        DEBUG_BREAKPOINT_RESPONSE: 'debug:breakpoint_response',

        TRACE_COMPLETED: 'trace:completed',
        TRACE_ERROR: 'trace:error',
    },

    // Debug Session
    DEBUG_SESSION_IDLE_TIMEOUT: 300000, // 5 минут - таймаут неактивной debug сессии

    // Trace Storage
    TRACE_RETENTION_TIME: 3600000,    // 1 час - время хранения completed traces
    ACTIVE_TRACE_MAX_AGE: 600000,     // 10 минут - максимальный возраст active trace
};
