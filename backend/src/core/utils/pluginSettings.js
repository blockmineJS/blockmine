const path = require('path');
const fs = require('fs/promises');
const { deepMergeSettings } = require('./settingsMerger');
const { isGroupedSettings, filterSecretSettings, prepareSettingsForSave } = require('./secretsFilter');

function parseDefaultValue(rawDefault) {
    if (rawDefault === undefined) return undefined;
    try {
        return JSON.parse(rawDefault);
    } catch {
        return rawDefault;
    }
}

function isPathInside(parent, child) {
    const rel = path.relative(parent, child);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

async function resolveSettingDefault(pluginPath, config) {
    if (!config) return undefined;
    if (config.type === 'json_file' && config.defaultPath) {
        const configFilePath = path.resolve(pluginPath, config.defaultPath);
        if (!isPathInside(path.resolve(pluginPath), configFilePath)) {
            return {};
        }
        try {
            const fileContent = await fs.readFile(configFilePath, 'utf-8');
            return JSON.parse(fileContent);
        } catch {
            return config.type === 'string[]' ? [] : {};
        }
    }
    return parseDefaultValue(config.default);
}

async function buildDefaultSettings(pluginPath, manifestSettings) {
    const defaults = {};
    if (!manifestSettings) return defaults;

    const grouped = isGroupedSettings(manifestSettings);
    if (grouped) {
        for (const categoryKey of Object.keys(manifestSettings)) {
            const categoryConfig = manifestSettings[categoryKey];
            if (!categoryConfig || typeof categoryConfig !== 'object' || !categoryConfig.label) continue;
            for (const settingKey of Object.keys(categoryConfig)) {
                if (settingKey === 'label') continue;
                const value = await resolveSettingDefault(pluginPath, categoryConfig[settingKey]);
                if (value !== undefined) {
                    defaults[settingKey] = value;
                }
            }
        }
    } else {
        for (const settingKey of Object.keys(manifestSettings)) {
            const value = await resolveSettingDefault(pluginPath, manifestSettings[settingKey]);
            if (value !== undefined) {
                defaults[settingKey] = value;
            }
        }
    }

    return defaults;
}

function parseManifest(plugin) {
    if (!plugin?.manifest) return {};
    if (typeof plugin.manifest === 'object') return plugin.manifest;
    try {
        return JSON.parse(plugin.manifest);
    } catch {
        return {};
    }
}

function parseSettings(plugin) {
    if (!plugin?.settings) return {};
    if (typeof plugin.settings === 'object') return plugin.settings;
    try {
        return JSON.parse(plugin.settings);
    } catch {
        return {};
    }
}

async function resolvePluginSettings(plugin) {
    const manifest = parseManifest(plugin);
    const savedSettings = parseSettings(plugin);
    const manifestSettings = manifest.settings || {};
    const defaults = await buildDefaultSettings(plugin.path, manifestSettings);
    return deepMergeSettings(defaults, savedSettings);
}

module.exports = {
    parseManifest,
    parseSettings,
    parseDefaultValue,
    resolveSettingDefault,
    buildDefaultSettings,
    resolvePluginSettings,
    isGroupedSettings,
    filterSecretSettings,
    prepareSettingsForSave,
};
