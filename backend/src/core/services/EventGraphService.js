const GraphValidator = require('../domain/services/GraphValidator');
const { GraphExecutionError, ValidationError } = require('../errors');

const graphValidator = new GraphValidator();

class EventGraphService {
    constructor({ eventGraphManager, eventGraphRepository, cacheManager, logger } = {}) {
        this.eventGraphManager = eventGraphManager;
        this.eventGraphRepository = eventGraphRepository;
        this.cache = cacheManager;
        this.logger = logger;
        this._graphCache = new Map();
    }

    async loadGraphsForBot(botId) {
        this.logger.info({ botId }, 'eventGraph.load.start');
        try {
            await this.eventGraphManager.loadGraphsForBot(botId);
            this.logger.info({ botId }, 'eventGraph.load.success');
        } catch (error) {
            this.logger.error({ botId, error }, 'eventGraph.load.error');
            throw new GraphExecutionError('eventGraph.errors.loadFailed', { cause: error, context: { botId } });
        }
    }

    unloadGraphsForBot(botId) {
        this.eventGraphManager.unloadGraphsForBot(botId);
        this._graphCache.delete(botId);
        this.logger.info({ botId }, 'eventGraph.unload.success');
    }

    async handleEvent(botId, eventType, args) {
        try {
            await this.eventGraphManager.handleEvent(botId, eventType, args);
        } catch (error) {
            this.logger.error({ botId, eventType, error }, 'eventGraph.event.error');
        }
    }

    async validateGraph(graphJson) {
        let graph;
        try {
            graph = typeof graphJson === 'string' ? JSON.parse(graphJson) : graphJson;
        } catch {
            throw new ValidationError('eventGraph.errors.invalidJson');
        }

        const result = graphValidator.validate(graph);
        if (!result.valid) {
            throw new ValidationError('eventGraph.errors.invalidStructure', { context: { errors: result.errors } });
        }
        return true;
    }

    async getGraphsForBot(botId) {
        if (this._graphCache.has(botId)) {
            return this._graphCache.get(botId);
        }
        const graphs = await this.eventGraphRepository.findByBotId(botId);
        this._graphCache.set(botId, graphs);
        return graphs;
    }

    invalidateCache(botId) {
        this._graphCache.delete(botId);
    }
}

module.exports = EventGraphService;
