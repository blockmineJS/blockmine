const DependencyResolver = require('../domain/services/DependencyResolver');
const { validatePluginManifest } = require('../validation/InputValidator');
const { PluginError, ValidationError } = require('../errors');

const dependencyResolver = new DependencyResolver();

class PluginManagementService {
    constructor({ pluginManager, pluginRepository, logger } = {}) {
        this.pluginManager = pluginManager;
        this.pluginRepository = pluginRepository;
        this.logger = logger;
    }

    async installFromGithub(botId, repoUrl, tag = null) {
        this.logger.info({ botId, repoUrl, tag }, 'plugin.install.github.start');
        try {
            const result = await this.pluginManager.installFromGithub(botId, repoUrl, undefined, false, tag);
            this.logger.info({ botId, pluginName: result.name }, 'plugin.install.github.success');
            return result;
        } catch (error) {
            this.logger.error({ botId, repoUrl, error }, 'plugin.install.github.error');
            throw new PluginError('plugin.errors.installFailed', { cause: error, context: { repoUrl } });
        }
    }

    async installFromLocalPath(botId, directoryPath) {
        this.logger.info({ botId, directoryPath }, 'plugin.install.local.start');
        try {
            const result = await this.pluginManager.installFromLocalPath(botId, directoryPath);
            this.logger.info({ botId, pluginName: result.name }, 'plugin.install.local.success');
            return result;
        } catch (error) {
            this.logger.error({ botId, directoryPath, error }, 'plugin.install.local.error');
            throw new PluginError('plugin.errors.installFailed', { cause: error, context: { directoryPath } });
        }
    }

    async updatePlugin(pluginId, targetTag = null, targetRepoUrl = null) {
        this.logger.info({ pluginId, targetTag }, 'plugin.update.start');
        try {
            const result = await this.pluginManager.updatePlugin(pluginId, targetTag, targetRepoUrl);
            this.logger.info({ pluginId, newVersion: result.version }, 'plugin.update.success');
            return result;
        } catch (error) {
            this.logger.error({ pluginId, error }, 'plugin.update.error');
            throw new PluginError('plugin.errors.updateFailed', { cause: error, context: { pluginId } });
        }
    }

    async deletePlugin(pluginId) {
        this.logger.info({ pluginId }, 'plugin.delete.start');
        try {
            await this.pluginManager.deletePlugin(pluginId);
            this.logger.info({ pluginId }, 'plugin.delete.success');
        } catch (error) {
            this.logger.error({ pluginId, error }, 'plugin.delete.error');
            throw new PluginError('plugin.errors.deleteFailed', { cause: error, context: { pluginId } });
        }
    }

    async validateManifest(manifest) {
        const result = validatePluginManifest(manifest);
        if (!result.valid) {
            throw new ValidationError('plugin.errors.invalidManifest', { context: { errors: result.errors } });
        }
        return true;
    }

    async checkDependencies(botId, manifest) {
        const installedPlugins = await this.pluginRepository.findByBotId(botId);
        const fakePlugin = { manifest: JSON.stringify(manifest) };
        return dependencyResolver.checkCompatibility(fakePlugin, installedPlugins);
    }

    async checkForUpdates(botId, catalog) {
        return this.pluginManager.checkForUpdates(botId, catalog);
    }

    async getInstalledPlugins(botId) {
        return this.pluginRepository.findByBotId(botId);
    }
}

module.exports = PluginManagementService;
