class BaseRepository {
    constructor({ prisma }) {
        this.prisma = prisma;
        // modelName устанавливается в дочерних классах
    }

    get model() {
        return this.prisma[this.modelName];
    }

    async findById(id) {
        return this.model.findUnique({ where: { id } });
    }

    async findMany(where = {}, options = {}) {
        return this.model.findMany({ where, ...options });
    }

    async findFirst(where, options = {}) {
        return this.model.findFirst({ where, ...options });
    }

    async create(data) {
        return this.model.create({ data });
    }

    async update(id, data) {
        return this.model.update({
            where: { id },
            data,
        });
    }

    async delete(id) {
        return this.model.delete({ where: { id } });
    }

    async count(where = {}) {
        return this.model.count({ where });
    }
}

module.exports = BaseRepository;
