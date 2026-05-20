const fs = require('fs/promises');
const path = require('path');
const prisma = require('../lib/prisma');

class PluginService {
    async registerPluginFromPath(directoryPath) {
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
                manifest,
            };

            return prisma.plugin.upsert({
                where: { name: pluginData.name },
                update: { ...pluginData },
                create: { ...pluginData },
            });
        } catch (error) {
            console.error(`[PluginService] Ошибка регистрации плагина из ${directoryPath}:`, error.message);
            throw new Error(`Не удалось зарегистрировать плагин: ${error.message}`);
        }
    }

    async syncPluginsWithDb() {
        return { ok: true };
    }
}

module.exports = new PluginService();
