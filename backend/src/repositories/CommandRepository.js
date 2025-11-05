const BaseRepository = require('./BaseRepository');

class CommandRepository extends BaseRepository {
    constructor({ prisma }) {
        super({ prisma });
        this.modelName = 'command';
    }

    async findByBotId(botId) {
        return this.model.findMany({
            where: { botId },
            orderBy: { name: 'asc' },
        });
    }

    async findEnabledByBotId(botId) {
        return this.model.findMany({
            where: {
                botId,
                isEnabled: true,
            },
            orderBy: { name: 'asc' },
        });
    }

    async findByName(botId, name) {
        return this.model.findFirst({
            where: { botId, name },
        });
    }

    async findByNameOrAlias(botId, nameOrAlias) {
        const commands = await this.model.findMany({
            where: { botId, isEnabled: true },
        });

        return commands.find(cmd => {
            if (cmd.name === nameOrAlias) return true;
            try {
                const aliases = JSON.parse(cmd.aliases || '[]');
                return aliases.includes(nameOrAlias);
            } catch {
                return false;
            }
        });
    }

    async updateEnabled(commandId, isEnabled) {
        return this.update(commandId, { isEnabled });
    }
}

module.exports = CommandRepository;
