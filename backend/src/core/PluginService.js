
const fs = require('fs/promises');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PluginService {
    /**
     * Регистрирует плагин по указанному пути к папке.
     * Читает package.json, извлекает манифест и создает запись в БД.
     * @param {string} directoryPath - Путь к папке с плагином.
     * @returns {Promise<object>} - Созданный или обновленный объект плагина.
     */
    async registerPluginFromPath(directoryPath) {
        console.log(`[PluginService] Попытка регистрации плагина из: ${directoryPath}`);
        
        const absolutePath = path.resolve(directoryPath);
        const packageJsonPath = path.join(absolutePath, 'package.json');

        try {
            await fs.access(packageJsonPath);
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);

            if (!packageJson.name || !packageJson.version || !packageJson.main) {
                throw new Error('package.json не содержит обязательных полей: name, version, main');
            }

            const manifest = packageJson.botpanel || {};

            const pluginData = {
                name: packageJson.name,
                description: packageJson.description || '',
                version: packageJson.version,
                path: path.join(absolutePath, packageJson.main),
                sourceType: 'LOCAL',
                sourceUri: absolutePath,
                manifest: manifest,
            };

            const plugin = await prisma.plugin.upsert({
                where: { name: pluginData.name },
                update: { ...pluginData },
                create: { ...pluginData },
            });

            console.log(`[PluginService] Плагин "${plugin.name}" успешно зарегистрирован/обновлен.`);
            return plugin;

        } catch (error) {
            console.error(`[PluginService] Ошибка регистрации плагина из ${directoryPath}:`, error.message);
            throw new Error(`Не удалось зарегистрировать плагин: ${error.message}`);
        }
    }
}

module.exports = new PluginService();