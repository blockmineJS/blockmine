class PluginStore {
    constructor(prisma, botId, pluginName) {
        this.prisma = prisma;
        this.botId = botId;
        this.pluginName = pluginName;
    }

    _whereKey(key) {
        return {
            pluginName_botId_key: {
                pluginName: this.pluginName,
                botId: this.botId,
                key,
            },
        };
    }

    async set(key, value) {
        if (typeof key !== 'string' || key.length === 0) {
            throw new Error('PluginStore: ключ должен быть непустой строкой.');
        }
        if (key.length > 512) {
            throw new Error('PluginStore: ключ слишком длинный (максимум 512 символов).');
        }
        let jsonValue;
        try {
            jsonValue = JSON.stringify(value);
        } catch (error) {
            throw new Error(`PluginStore: значение нельзя сериализовать в JSON: ${error.message}`);
        }
        if (jsonValue === undefined) {
            jsonValue = 'null';
        }
        if (jsonValue.length > 1024 * 1024) {
            throw new Error('PluginStore: значение слишком большое (максимум 1 МБ).');
        }
        await this.prisma.pluginDataStore.upsert({
            where: this._whereKey(key),
            update: { value: jsonValue },
            create: {
                pluginName: this.pluginName,
                botId: this.botId,
                key,
                value: jsonValue,
            },
        });
    }

    async get(key) {
        const data = await this.prisma.pluginDataStore.findUnique({ where: this._whereKey(key) });
        if (!data) return null;
        try {
            return JSON.parse(data.value);
        } catch (error) {
            console.error(`[PluginStore] Не удалось распарсить значение ключа "${key}" для плагина ${this.pluginName}:`, error);
            return data.value;
        }
    }

    async delete(key) {
        try {
            await this.prisma.pluginDataStore.delete({ where: this._whereKey(key) });
            return true;
        } catch (error) {
            if (error.code === 'P2025') {
                return false;
            }
            console.error(`[PluginStore] Ошибка удаления ключа "${key}" для плагина ${this.pluginName}:`, error);
            return false;
        }
    }

    async has(key) {
        const count = await this.prisma.pluginDataStore.count({
            where: { pluginName: this.pluginName, botId: this.botId, key },
        });
        return count > 0;
    }

    async getAll() {
        const allData = await this.prisma.pluginDataStore.findMany({
            where: { pluginName: this.pluginName, botId: this.botId },
        });
        const map = new Map();
        for (const item of allData) {
            try {
                map.set(item.key, JSON.parse(item.value));
            } catch (error) {
                console.error(`[PluginStore] Не удалось распарсить значение ключа "${item.key}" для плагина ${this.pluginName}:`, error);
                map.set(item.key, item.value);
            }
        }
        return map;
    }
}

module.exports = PluginStore;
