class PluginStore {
    constructor(prisma, botId, pluginName) {
        this.prisma = prisma;
        this.botId = botId;
        this.pluginName = pluginName;
    }

    async set(key, value) {
        const jsonValue = JSON.stringify(value);
        await this.prisma.pluginDataStore.upsert({
            where: {
                pluginName_botId_key: {
                    pluginName: this.pluginName,
                    botId: this.botId,
                    key: key
                }
            },
            update: {
                value: jsonValue
            },
            create: {
                pluginName: this.pluginName,
                botId: this.botId,
                key: key,
                value: jsonValue
            }
        });
    }

    async get(key) {
        const data = await this.prisma.pluginDataStore.findUnique({
            where: {
                pluginName_botId_key: {
                    pluginName: this.pluginName,
                    botId: this.botId,
                    key: key
                }
            }
        });
        return data ? JSON.parse(data.value) : null;
    }

    async delete(key) {
        try {
            await this.prisma.pluginDataStore.delete({
                where: {
                    pluginName_botId_key: {
                        pluginName: this.pluginName,
                        botId: this.botId,
                        key: key
                    }
                }
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    async has(key) {
        const count = await this.prisma.pluginDataStore.count({
            where: {
                pluginName: this.pluginName,
                botId: this.botId,
                key: key
            }
        });
        return count > 0;
    }

    async getAll() {
        const allData = await this.prisma.pluginDataStore.findMany({
            where: {
                pluginName: this.pluginName,
                botId: this.botId
            }
        });
        const map = new Map();
        for (const item of allData) {
            map.set(item.key, JSON.parse(item.value));
        }
        return map;
    }
}

module.exports = PluginStore;

