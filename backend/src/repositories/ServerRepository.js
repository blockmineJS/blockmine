const BaseRepository = require('./BaseRepository');

class ServerRepository extends BaseRepository {
    constructor({ prisma }) {
        super({ prisma });
        this.modelName = 'server';
    }

    async findByHost(host, port) {
        return this.model.findFirst({
            where: { host, port },
        });
    }

    async findAllWithBots() {
        return this.model.findMany({
            include: {
                bots: {
                    orderBy: { sortOrder: 'asc' },
                },
            },
            orderBy: { id: 'asc' },
        });
    }
}

module.exports = ServerRepository;
