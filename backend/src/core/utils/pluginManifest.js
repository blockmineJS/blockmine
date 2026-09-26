const semver = require('semver');
const { isGroupedSettings } = require('./secretsFilter');

function pluginDependencySatisfied(installedVersion, range) {
    if (!range || range === '*') return true;
    const installed = semver.coerce(installedVersion);
    if (!installed) return false;
    if (semver.validRange(range)) return semver.satisfies(installed, range);
    return String(installedVersion) === String(range);
}

function flattenSettingKeys(settings) {
    const keys = new Map();
    if (!settings || typeof settings !== 'object') return keys;
    if (isGroupedSettings(settings)) {
        for (const category of Object.values(settings)) {
            if (!category || typeof category !== 'object') continue;
            for (const [key, config] of Object.entries(category)) {
                if (key === 'label' || !config || typeof config !== 'object' || !config.type) continue;
                keys.set(key, config.label || key);
            }
        }
        return keys;
    }
    for (const [key, config] of Object.entries(settings)) {
        if (!config || typeof config !== 'object') continue;
        keys.set(key, config.label || key);
    }
    return keys;
}

function diffSettings(previousSettings, nextSettings) {
    const previous = flattenSettingKeys(previousSettings);
    const next = flattenSettingKeys(nextSettings);
    const added = [];
    const removed = [];
    for (const [key, label] of next) {
        if (!previous.has(key)) added.push({ key, label });
    }
    for (const [key, label] of previous) {
        if (!next.has(key)) removed.push({ key, label });
    }
    const renamed = [];
    const usedAdded = new Set();
    for (const gone of removed) {
        const match = added.find((item) => item.label && item.label === gone.label && !usedAdded.has(item.key));
        if (!match) continue;
        usedAdded.add(match.key);
        renamed.push({ from: gone.key, to: match.key, label: gone.label });
    }
    return {
        added: added.filter((item) => !usedAdded.has(item.key)),
        removed: removed.filter((item) => !renamed.some((entry) => entry.from === item.key)),
        renamed,
    };
}

function listDeclaredPermissions(manifest) {
    const raw = manifest?.permissions;
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((item) => item && typeof item.name === 'string' && item.name.trim())
        .map((item) => ({
            name: item.name.trim(),
            description: typeof item.description === 'string' ? item.description : '',
        }));
}

module.exports = {
    pluginDependencySatisfied,
    flattenSettingKeys,
    diffSettings,
    listDeclaredPermissions,
};
