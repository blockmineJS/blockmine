
const semver = require('semver');

class DependencyService {
    /**
     * Анализирует плагины, разрешает зависимости и возвращает отсортированный список и информацию о проблемах.
     * @param {Array} enabledPlugins - Массив включенных плагинов (записи из БД).
     * @param {Array} allBotPlugins - Массив всех плагинов, установленных для бота.
     * @returns {{sortedPlugins: Array, pluginInfo: Object, hasCriticalIssues: boolean}}
     */
    resolveDependencies(enabledPlugins, allBotPlugins) {
        const pluginMap = new Map(allBotPlugins.map(p => [p.name, p]));
        const enabledPluginSet = new Set(enabledPlugins.map(p => p.name));
        const pluginInfo = {};
        let hasCriticalIssues = false;

        for (const plugin of allBotPlugins) {
            const manifest = plugin.manifest ? JSON.parse(plugin.manifest) : {};
            pluginInfo[plugin.id] = {
                ...plugin,
                isEnabled: enabledPluginSet.has(plugin.name),
                issues: [],
                dependencies: manifest.dependencies ? Object.entries(manifest.dependencies) : [],
            };
        }

        for (const plugin of enabledPlugins) {
            const info = pluginInfo[plugin.id];
            
            for (const [depName, depVersion] of info.dependencies) {
                const dependency = pluginMap.get(depName);
                let issue = null;

                if (!dependency) {
                    issue = { type: 'missing_dependency', message: `Требуемый плагин "${depName}" не найден.` };
                    hasCriticalIssues = true;
                } else if (!enabledPluginSet.has(depName)) {
                    issue = { type: 'disabled_dependency', message: `Требуемый плагин "${depName}" отключен.` };
                } else if (!semver.satisfies(dependency.version, depVersion)) {
                    issue = { type: 'version_mismatch', message: `Требуется версия "${depVersion}" для "${depName}", но найдена v${dependency.version}.` };
                    hasCriticalIssues = true;
                }
                if (issue) info.issues.push(issue);
            }
        }
        
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();

        function visit(pluginName) {
            if (visited.has(pluginName)) return;
            if (visiting.has(pluginName)) {
                hasCriticalIssues = true;
                const cyclePath = Array.from(visiting).join(' -> ') + ` -> ${pluginName}`;
                for (const p of enabledPlugins) {
                    if (visiting.has(p.name)) {
                        pluginInfo[p.id].issues.push({ type: 'circular_dependency', message: `Обнаружена циклическая зависимость: ${cyclePath}` });
                    }
                }
                return;
            }
            
            visiting.add(pluginName);

            const plugin = pluginMap.get(pluginName);
            if (plugin) {
                const manifest = plugin.manifest ? JSON.parse(plugin.manifest) : {};
                if (manifest.dependencies) {
                    for (const depName in manifest.dependencies) {
                        if (enabledPluginSet.has(depName)) {
                            visit(depName);
                        }
                    }
                }
            }
            
            visiting.delete(pluginName);
            visited.add(pluginName);
            if (plugin) {
                sorted.push(plugin);
            }
        }

        for (const plugin of enabledPlugins) {
            visit(plugin.name);
        }

        return { sortedPlugins: sorted, pluginInfo, hasCriticalIssues };
    }
}

module.exports = new DependencyService();