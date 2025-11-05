/**
 * BotManager Facade - делегирует вызовы специализированным сервисам
 * Этот класс - точка входа для обратной совместимости со старым кодом
 */
class BotManager {
    constructor({
        botLifecycleService,
        commandExecutionService,
        botProcessManager,
        resourceMonitorService,
        telemetryService,
        cacheManager,
        eventGraphManager,
        logger
    }) {
        this.lifecycleService = botLifecycleService;
        this.commandService = commandExecutionService;
        this.processManager = botProcessManager;
        this.resourceMonitor = resourceMonitorService;
        this.telemetry = telemetryService;
        this.cache = cacheManager;
        this.eventGraphManager = eventGraphManager;
        this.logger = logger;

        // Геттеры для обратной совместимости
        this.bots = this.processManager.getAllProcesses();
        this.nodeRegistry = require('./NodeRegistry');

        this._startBackgroundTasks();
    }

    _startBackgroundTasks() {
        this.resourceMonitor.startMonitoring(5000);
        this.telemetry.startHeartbeat(5 * 60 * 1000);
        
        setInterval(() => this.updateAllResourceUsage(), 5000);

        setInterval(() => this.syncBotStatuses(), 10000);
    }

    initialize() {
        if (!this.lifecycleService.eventGraphManager) {
            this.lifecycleService.eventGraphManager = this.eventGraphManager;
        }
    }

    // === Lifecycle methods ===
    async startBot(botConfig) {
        return this.lifecycleService.startBot(botConfig);
    }

    stopBot(botId) {
        return this.lifecycleService.stopBot(botId);
    }

    async restartBot(botId) {
        return this.lifecycleService.restartBot(botId);
    }

    isBotRunning(botId) {
        return this.lifecycleService.isBotRunning(botId);
    }

    // === Configuration ===
    async loadConfigForBot(botId) {
        return this.lifecycleService.loadConfigForBot(botId);
    }

    invalidateConfigCache(botId) {
        this.lifecycleService.invalidateConfigCache(botId);
    }

    reloadBotConfigInRealTime(botId) {
        this.lifecycleService.reloadBotConfigInRealTime(botId);
    }

    // === Command execution ===
    async handleCommandValidation(botConfig, message) {
        return this.commandService.handleCommandValidation(botConfig, message);
    }

    async validateAndExecuteCommandForApi(botId, username, commandName, args) {
        return this.commandService.validateAndExecuteCommandForApi(botId, username, commandName, args);
    }

    async handleCommandRegistration(botId, commandConfig) {
        return this.commandService.handleCommandRegistration(botId, commandConfig);
    }

    async handleGroupRegistration(botId, groupConfig) {
        return this.commandService.handleGroupRegistration(botId, groupConfig);
    }

    async handlePermissionsRegistration(botId, message) {
        return this.commandService.handlePermissionsRegistration(botId, message.permissions);
    }

    async handleAddPermissionsToGroup(botId, message) {
        return this.commandService.handleAddPermissionsToGroup(botId, message);
    }

    // === Process management ===
    subscribeToPluginUi(botId, pluginName, socket) {
        this.processManager.subscribeToPluginUi(botId, pluginName, socket);
    }

    unsubscribeFromPluginUi(botId, pluginName, socket) {
        this.processManager.unsubscribeFromPluginUi(botId, pluginName, socket);
    }

    handleSocketDisconnect(socket) {
        this.processManager.handleSocketDisconnect(socket);
    }

    // === Bot actions ===
    sendMessageToBot(botId, message, chatType = 'command', username = null) {
        return this.lifecycleService.sendMessageToBot(botId, message, chatType, username);
    }

    lookAt(botId, position) {
        return this.lifecycleService.lookAt(botId, position);
    }

    async reloadPlugins(botId) {
        return this.lifecycleService.reloadPlugins(botId);
    }

    sendServerCommandToBot(botId, command) {
        this.lifecycleService.sendServerCommandToBot(botId, command);
    }

    async getPlayerList(botId) {
        return this.lifecycleService.getPlayerList(botId);
    }

    // === User cache ===
    invalidateUserCache(botId, username) {
        return this.lifecycleService.invalidateUserCache(botId, username);
    }

    invalidateAllUserCache(botId) {
        return this.lifecycleService.invalidateAllUserCache(botId);
    }

    // === Resource monitoring ===
    async updateAllResourceUsage() {
        const usageData = await this.resourceMonitor.updateAllResourceUsage();
        const { getIO } = require('../real-time/socketHandler');
        getIO().emit('bots:usage', usageData);
    }

    getBotIdByPid(pid) {
        return this.resourceMonitor.getBotIdByPid(pid);
    }

    // === Telemetry ===
    triggerHeartbeat() {
        this.telemetry.triggerHeartbeat();
    }

    async sendHeartbeat() {
        return this.telemetry.sendHeartbeat();
    }

    // === Logging & state ===
    appendLog(botId, logContent) {
        this.lifecycleService.appendLog(botId, logContent);
    }

    getBotLogs(botId) {
        return this.lifecycleService.getBotLogs(botId);
    }

    getFullState() {
        return this.lifecycleService.getFullState();
    }

    emitStatusUpdate(botId, status, message = null) {
        this.lifecycleService.emitStatusUpdate(botId, status, message);
    }

    syncBotStatuses() {
        const processes = this.processManager.getAllProcesses();
        const { getIO } = require('../real-time/socketHandler');

        for (const [botId, child] of processes.entries()) {
            const actualStatus = child.killed ? 'stopped' : 'running';
            getIO().emit('bot:status', { botId, status: actualStatus });
        }
    }

    // === EventGraph ===
    setEventGraphManager(manager) {
        this.eventGraphManager = manager;
        this.lifecycleService.eventGraphManager = manager;
    }

    // === Legacy async methods для migration ===
    async _syncSystemPermissions(botId) {
        return this.lifecycleService._syncSystemPermissions(botId);
    }

    async _ensureDefaultEventGraphs(botId) {
        return;
    }
}

module.exports = BotManager;
