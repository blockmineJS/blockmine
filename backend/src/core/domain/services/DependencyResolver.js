const semver = require('semver');

const ISSUE_TYPES = {
    MISSING: 'missing_dependency',
    DISABLED: 'disabled_dependency',
    VERSION_MISMATCH: 'version_mismatch',
    CIRCULAR: 'circular_dependency',
};

class DependencyResolver {
    resolve(enabledPlugins, allPlugins) {
        const pluginMap = new Map(allPlugins.map(p => [p.name, p]));
        const enabledSet = new Set(enabledPlugins.map(p => p.name));
        const pluginInfo = {};
        let hasCriticalIssues = false;

        for (const plugin of allPlugins) {
            const manifest = this._parseManifest(plugin.manifest);
            pluginInfo[plugin.id] = {
                ...plugin,
                isEnabled: enabledSet.has(plugin.name),
                issues: [],
                dependencies: manifest.dependencies ? Object.entries(manifest.dependencies) : [],
                optionalDependencies: manifest.optionalDependencies ? Object.entries(manifest.optionalDependencies) : [],
            };
        }

        for (const plugin of enabledPlugins) {
            const info = pluginInfo[plugin.id];

            for (const [depName, depRange] of info.dependencies) {
                const issue = this._checkDependency(depName, depRange, pluginMap, enabledSet, false);
                if (issue) {
                    info.issues.push(issue);
                    if (issue.type !== ISSUE_TYPES.DISABLED) hasCriticalIssues = true;
                }
            }

            for (const [depName, depRange] of info.optionalDependencies) {
                const issue = this._checkDependency(depName, depRange, pluginMap, enabledSet, true);
                if (issue) {
                    info.issues.push({ ...issue, optional: true });
                }
            }
        }

        const { sorted, cycles } = this._topologicalSort(enabledPlugins, pluginMap, enabledSet);

        for (const cycle of cycles) {
            hasCriticalIssues = true;
            const cyclePath = cycle.join(' -> ');
            for (const plugin of enabledPlugins) {
                if (cycle.includes(plugin.name)) {
                    pluginInfo[plugin.id].issues.push({
                        type: ISSUE_TYPES.CIRCULAR,
                        messageKey: 'dependency.circular',
                        context: { cyclePath },
                    });
                }
            }
        }

        return { sortedPlugins: sorted, pluginInfo, hasCriticalIssues };
    }

    checkCompatibility(plugin, installedPlugins) {
        const pluginMap = new Map(installedPlugins.map(p => [p.name, p]));
        const manifest = this._parseManifest(plugin.manifest);
        const deps = manifest.dependencies || {};
        const issues = [];

        for (const [depName, depRange] of Object.entries(deps)) {
            const dep = pluginMap.get(depName);
            if (!dep) {
                issues.push({ type: ISSUE_TYPES.MISSING, messageKey: 'dependency.missing', context: { depName, depRange } });
            } else if (!this._satisfies(dep.version, depRange)) {
                const suggestion = this._suggestResolution(dep.version, depRange);
                issues.push({ type: ISSUE_TYPES.VERSION_MISMATCH, messageKey: 'dependency.versionMismatch', context: { depName, depRange, installed: dep.version, suggestion } });
            }
        }

        return { compatible: issues.length === 0, issues };
    }

    _checkDependency(depName, depRange, pluginMap, enabledSet, optional) {
        const dep = pluginMap.get(depName);
        if (!dep) {
            return optional ? null : { type: ISSUE_TYPES.MISSING, messageKey: 'dependency.missing', context: { depName, depRange } };
        }
        if (!enabledSet.has(depName)) {
            return { type: ISSUE_TYPES.DISABLED, messageKey: 'dependency.disabled', context: { depName } };
        }
        if (!this._satisfies(dep.version, depRange)) {
            const suggestion = this._suggestResolution(dep.version, depRange);
            return { type: ISSUE_TYPES.VERSION_MISMATCH, messageKey: 'dependency.versionMismatch', context: { depName, depRange, installed: dep.version, suggestion } };
        }
        return null;
    }

    _satisfies(version, range) {
        try {
            const coerced = semver.coerce(version);
            if (!coerced) return false;
            return semver.satisfies(coerced.version, range);
        } catch {
            return false;
        }
    }

    _suggestResolution(installedVersion, requiredRange) {
        const coerced = semver.coerce(installedVersion);
        if (!coerced) return null;
        const minVersion = semver.minVersion(requiredRange);
        if (minVersion && semver.gt(minVersion.version, coerced.version)) {
            return `dependency.suggestion.upgrade`;
        }
        return `dependency.suggestion.downgrade`;
    }

    _topologicalSort(enabledPlugins, pluginMap, enabledSet) {
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();
        const cycles = [];

        const visit = (name, path) => {
            if (visited.has(name)) return;
            if (visiting.has(name)) {
                const cycleStart = path.indexOf(name);
                cycles.push(path.slice(cycleStart).concat(name));
                return;
            }

            visiting.add(name);
            const plugin = pluginMap.get(name);
            if (plugin) {
                const manifest = this._parseManifest(plugin.manifest);
                const deps = { ...(manifest.dependencies || {}), ...(manifest.optionalDependencies || {}) };
                for (const depName of Object.keys(deps)) {
                    if (enabledSet.has(depName)) {
                        visit(depName, [...path, name]);
                    }
                }
            }
            visiting.delete(name);
            visited.add(name);
            if (plugin) sorted.push(plugin);
        };

        for (const plugin of enabledPlugins) {
            visit(plugin.name, []);
        }

        return { sorted, cycles };
    }

    _parseManifest(manifest) {
        if (!manifest) return {};
        if (typeof manifest === 'object') return manifest;
        try {
            return JSON.parse(manifest);
        } catch {
            return {};
        }
    }
}

module.exports = DependencyResolver;
