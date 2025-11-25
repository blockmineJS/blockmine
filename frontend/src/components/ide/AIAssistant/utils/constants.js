export const PROVIDERS = {
    OPENROUTER: 'openrouter',
    GOOGLE: 'google'
};

export const DEFAULT_MODELS = {
    [PROVIDERS.OPENROUTER]: 'x-ai/grok-4.1-fast',
    [PROVIDERS.GOOGLE]: 'gemini-flash-latest'
};

export const OPENROUTER_MODELS = [
    { value: 'x-ai/grok-4.1-fast', label: 'Grok 4.1 Fast' },
];

export const GOOGLE_MODELS = [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-flash-latest', label: 'Gemini Flash Latest' }
];

export const STORAGE_KEYS = {
    PROVIDER: 'ai_provider',
    API_KEY: 'ai_api_key',
    API_ENDPOINT: 'ai_api_endpoint',
    MODEL_PREFIX: 'ai_model_',
    USE_CUSTOM_MODEL: 'ai_use_custom_model',
    CUSTOM_MODEL: 'ai_custom_model',
    PROXY: 'ai_proxy'
};

export const DEFAULT_API_ENDPOINT = 'https://openrouter.ai/api/v1';

export const SSE_EVENT_TYPES = {
    CHUNK: 'chunk',
    DONE: 'done',
    ERROR: 'error',
    TOOL_CALL: 'tool_call',
    TOOL_RESULT: 'tool_result',
    FILE_UPDATED: 'file_updated',
    FILE_DELETED: 'file_deleted',
    FOLDER_DELETED: 'folder_deleted'
};

export const TOOL_NAMES = {
    READ_FILE: 'readFile',
    UPDATE_FILE: 'updateFile',
    GET_PROJECT_TREE: 'getProjectTree',
    GET_FULL_PROJECT_CONTEXT: 'getFullProjectContext',
    READ_BOT_LOGS: 'readBotLogs',
    DELETE_FILE: 'deleteFile',
    DELETE_FOLDER: 'deleteFolder'
};
