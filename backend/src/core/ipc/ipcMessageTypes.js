const MessageTypes = {
  PLUGIN: {
    UI_START_UPDATES: 'plugin:ui:start-updates',
    UI_DATA: 'plugin:data',
  },

  SYSTEM: {
    GET_PLAYER_LIST: 'system:get_player_list',
    GET_PLAYER_LIST_RESPONSE: 'get_player_list_response',
    GET_NEARBY_ENTITIES: 'system:get_nearby_entities',
    GET_NEARBY_ENTITIES_RESPONSE: 'get_nearby_entities_response',
  },

  VIEWER: {
    GET_STATE: 'viewer:get_state',
    STATE_RESPONSE: 'viewer:state_response',
    CONTROL: 'viewer:control',
    CHAT: 'viewer:chat',
    SPAWN: 'viewer:spawn',
    HEALTH: 'viewer:health',
    MOVE: 'viewer:move',
    BLOCK_UPDATE: 'viewer:blockUpdate',
  },

  BOT: {
    READY: 'bot_ready',
    STATUS: 'status',
    LOG: 'log',
    STOP: 'stop',
    START: 'start',
    RESTART: 'restart_bot',
    CHANGE_CREDENTIALS: 'change_credentials',
    UPDATE_CREDENTIALS: 'update_credentials',
    EVENT: 'event',
  },

  GRAPH: {
    EXECUTE_EVENT_GRAPH: 'execute_event_graph',
    EXECUTE_HANDLER: 'execute_handler',
    EXECUTE_COMMAND_REQUEST: 'execute_command_request',
    EXECUTE_COMMAND_RESPONSE: 'execute_command_response',
    TRACE_COMPLETED: 'trace:completed',
  },

  DEBUG: {
    CHECK_BREAKPOINT: 'debug:check_breakpoint',
    BREAKPOINT_RESPONSE: 'debug:breakpoint_response',
    CHECK_STEP_MODE: 'debug:check_step_mode',
    STEP_RESPONSE: 'debug:step_response',
  },

  COMMAND: {
    REGISTER: 'register_command',
    REGISTER_TEMP: 'register_temp_command',
    UNREGISTER_TEMP: 'unregister_temp_command',
    VALIDATE_AND_RUN: 'validate_and_run_command',
    HANDLE_PERMISSION_ERROR: 'handle_permission_error',
    HANDLE_WRONG_CHAT: 'handle_wrong_chat',
    HANDLE_COOLDOWN: 'handle_cooldown',
    HANDLE_BLACKLIST: 'handle_blacklist',
  },

  CONFIG: {
    RELOAD: 'config:reload',
  },

  CHAT: {
    SEND_MESSAGE: 'send_message',
    CHAT: 'chat',
    ACTION: 'action',
  },

  SERVER: {
    COMMAND: 'server_command',
  },

  PLUGINS: {
    RELOAD: 'plugins:reload',
  },

  USER: {
    ACTION_RESPONSE: 'user_action_response',
    REQUEST_ACTION: 'request_user_action',
    INVALIDATE_USER_CACHE: 'invalidate_user_cache',
    INVALIDATE_ALL_USER_CACHE: 'invalidate_all_user_cache',
    CREDENTIALS_OPERATION_RESPONSE: 'credentials_operation_response',
  },

  WEBSOCKET: {
    SEND_MESSAGE: 'send_websocket_message',
  },
};

const EventTypes = {
  LOG: 'log',
  EVENT: 'event',
  BOT_READY: 'bot_ready',
  STATUS: 'status',
  CHAT: 'chat',
  WHISPER: 'whisper',
  RAW_MESSAGE: 'raw_message',
  PLAYER_JOINED: 'playerJoined',
  PLAYER_LEFT: 'playerLeft',
  ENTITY_SPAWN: 'entitySpawn',
  ENTITY_MOVED: 'entityMoved',
  ENTITY_GONE: 'entityGone',
  BOT_DIED: 'botDied',
  HEALTH: 'health',
  KICKED: 'kicked',
  ERROR: 'error',
  END: 'end',
  SPAWN: 'spawn',
};

module.exports = { MessageTypes, EventTypes };