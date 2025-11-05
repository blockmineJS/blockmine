const DependencyService = require('../../core/DependencyService');

describe('DependencyService', () => {
    describe('resolveDependencies', () => {
        test('должен вернуть пустой список для пустого массива плагинов', () => {
            const result = DependencyService.resolveDependencies([], []);

            expect(result.sortedPlugins).toEqual([]);
            expect(result.pluginInfo).toEqual({});
            expect(result.hasCriticalIssues).toBe(false);
        });

        test('должен обработать плагины без зависимостей', () => {
            const allPlugins = [
                {
                    id: 1,
                    name: 'plugin1',
                    version: '1.0.0',
                    manifest: JSON.stringify({ name: 'plugin1', version: '1.0.0' }),
                },
                {
                    id: 2,
                    name: 'plugin2',
                    version: '1.0.0',
                    manifest: JSON.stringify({ name: 'plugin2', version: '1.0.0' }),
                },
            ];

            const enabledPlugins = [allPlugins[0], allPlugins[1]];

            const result = DependencyService.resolveDependencies(enabledPlugins, allPlugins);

            expect(result.sortedPlugins).toHaveLength(2);
            expect(result.hasCriticalIssues).toBe(false);
            expect(result.pluginInfo[1].issues).toEqual([]);
            expect(result.pluginInfo[2].issues).toEqual([]);
        });

        test('должен отсортировать плагины по зависимостям (A зависит от B)', () => {
            const allPlugins = [
                {
                    id: 1,
                    name: 'pluginA',
                    version: '1.0.0',
                    manifest: JSON.stringify({
                        name: 'pluginA',
                        version: '1.0.0',
                        dependencies: { pluginB: '^1.0.0' },
                    }),
                },
                {
                    id: 2,
                    name: 'pluginB',
                    version: '1.0.0',
                    manifest: JSON.stringify({ name: 'pluginB', version: '1.0.0' }),
                },
            ];

            const enabledPlugins = [allPlugins[0], allPlugins[1]];

            const result = DependencyService.resolveDependencies(enabledPlugins, allPlugins);

            // pluginB должен быть первым, т.к. pluginA зависит от него
            expect(result.sortedPlugins[0].name).toBe('pluginB');
            expect(result.sortedPlugins[1].name).toBe('pluginA');
            expect(result.hasCriticalIssues).toBe(false);
        });

        test('должен обработать цепочку зависимостей (A -> B -> C)', () => {
            const allPlugins = [
                {
                    id: 1,
                    name: 'pluginA',
                    version: '1.0.0',
                    manifest: JSON.stringify({
                        dependencies: { pluginB: '^1.0.0' },
                    }),
                },
                {
                    id: 2,
                    name: 'pluginB',
                    version: '1.0.0',
                    manifest: JSON.stringify({
                        dependencies: { pluginC: '^1.0.0' },
                    }),
                },
                {
                    id: 3,
                    name: 'pluginC',
                    version: '1.0.0',
                    manifest: JSON.stringify({}),
                },
            ];

            const enabledPlugins = [allPlugins[0], allPlugins[1], allPlugins[2]];

            const result = DependencyService.resolveDependencies(enabledPlugins, allPlugins);

            // Порядок: C -> B -> A
            expect(result.sortedPlugins[0].name).toBe('pluginC');
            expect(result.sortedPlugins[1].name).toBe('pluginB');
            expect(result.sortedPlugins[2].name).toBe('pluginA');
            expect(result.hasCriticalIssues).toBe(false);
        });

        test('должен обнаружить отсутствующую зависимость', () => {
            const allPlugins = [
                {
                    id: 1,
                    name: 'pluginA',
                    version: '1.0.0',
                    manifest: JSON.stringify({
                        dependencies: { nonExistentPlugin: '^1.0.0' },
                    }),
                },
            ];

            const enabledPlugins = [allPlugins[0]];

            const result = DependencyService.resolveDependencies(enabledPlugins, allPlugins);

            expect(result.hasCriticalIssues).toBe(true);
            expect(result.pluginInfo[1].issues).toHaveLength(1);
            expect(result.pluginInfo[1].issues[0].type).toBe('missing_dependency');
            expect(result.pluginInfo[1].issues[0].message).toContain('nonExistentPlugin');
        });

        test('должен обнаружить отключенную зависимость', () => {
            const allPlugins = [
                {
                    id: 1,
                    name: 'pluginA',
                    version: '1.0.0',
                    manifest: JSON.stringify({
                        dependencies: { pluginB: '^1.0.0' },
                    }),
                },
                {
                    id: 2,
                    name: 'pluginB',
                    version: '1.0.0',
                    manifest: JSON.stringify({}),
                },
            ];

            // pluginB существует, но не включен
            const enabledPlugins = [allPlugins[0]];

            const result = DependencyService.resolveDependencies(enabledPlugins, allPlugins);

            expect(result.hasCriticalIssues).toBe(false); // disabled_dependency не критичная
            expect(result.pluginInfo[1].issues).toHaveLength(1);
            expect(result.pluginInfo[1].issues[0].type).toBe('disabled_dependency');
            expect(result.pluginInfo[1].issues[0].message).toContain('pluginB');
        });

        test('должен обнаружить несовместимость версий', () => {
            const allPlugins = [
                {
                    id: 1,
                    name: 'pluginA',
                    version: '1.0.0',
                    manifest: JSON.stringify({
                        dependencies: { pluginB: '^2.0.0' }, // Требует версию 2.x
                    }),
                },
                {
                    id: 2,
                    name: 'pluginB',
                    version: '1.5.0', // Но установлена 1.5.0
                    manifest: JSON.stringify({}),
                },
            ];

            const enabledPlugins = [allPlugins[0], allPlugins[1]];

            const result = DependencyService.resolveDependencies(enabledPlugins, allPlugins);

            expect(result.hasCriticalIssues).toBe(true);
            expect(result.pluginInfo[1].issues).toHaveLength(1);
            expect(result.pluginInfo[1].issues[0].type).toBe('version_mismatch');
            expect(result.pluginInfo[1].issues[0].message).toContain('^2.0.0');
            expect(result.pluginInfo[1].issues[0].message).toContain('1.5.0');
        });

        test('должен обнаружить циклическую зависимость (A -> B -> A)', () => {
            const allPlugins = [
                {
                    id: 1,
                    name: 'pluginA',
                    version: '1.0.0',
                    manifest: JSON.stringify({
                        dependencies: { pluginB: '^1.0.0' },
                    }),
                },
                {
                    id: 2,
                    name: 'pluginB',
                    version: '1.0.0',
                    manifest: JSON.stringify({
                        dependencies: { pluginA: '^1.0.0' },
                    }),
                },
            ];

            const enabledPlugins = [allPlugins[0], allPlugins[1]];

            const result = DependencyService.resolveDependencies(enabledPlugins, allPlugins);

            expect(result.hasCriticalIssues).toBe(true);

            // Один из плагинов должен иметь ошибку циклической зависимости
            const hasCircularError =
                result.pluginInfo[1].issues.some(i => i.type === 'circular_dependency') ||
                result.pluginInfo[2].issues.some(i => i.type === 'circular_dependency');

            expect(hasCircularError).toBe(true);
        });

        test('должен обработать плагины без manifest', () => {
            const allPlugins = [
                {
                    id: 1,
                    name: 'pluginA',
                    version: '1.0.0',
                    manifest: null,
                },
            ];

            const enabledPlugins = [allPlugins[0]];

            const result = DependencyService.resolveDependencies(enabledPlugins, allPlugins);

            expect(result.sortedPlugins).toHaveLength(1);
            expect(result.pluginInfo[1].dependencies).toEqual([]);
            expect(result.hasCriticalIssues).toBe(false);
        });

        test('должен правильно помечать включенные/выключенные плагины', () => {
            const allPlugins = [
                {
                    id: 1,
                    name: 'pluginA',
                    version: '1.0.0',
                    manifest: JSON.stringify({}),
                },
                {
                    id: 2,
                    name: 'pluginB',
                    version: '1.0.0',
                    manifest: JSON.stringify({}),
                },
            ];

            // Только pluginA включен
            const enabledPlugins = [allPlugins[0]];

            const result = DependencyService.resolveDependencies(enabledPlugins, allPlugins);

            expect(result.pluginInfo[1].isEnabled).toBe(true);
            expect(result.pluginInfo[2].isEnabled).toBe(false);
        });

        test('должен обработать сложный граф зависимостей', () => {
            const allPlugins = [
                {
                    id: 1,
                    name: 'ui',
                    version: '1.0.0',
                    manifest: JSON.stringify({
                        dependencies: { core: '^1.0.0', utils: '^1.0.0' },
                    }),
                },
                {
                    id: 2,
                    name: 'core',
                    version: '1.0.0',
                    manifest: JSON.stringify({
                        dependencies: { utils: '^1.0.0' },
                    }),
                },
                {
                    id: 3,
                    name: 'utils',
                    version: '1.0.0',
                    manifest: JSON.stringify({}),
                },
            ];

            const enabledPlugins = [allPlugins[0], allPlugins[1], allPlugins[2]];

            const result = DependencyService.resolveDependencies(enabledPlugins, allPlugins);

            // utils должен быть первым (ни от кого не зависит)
            expect(result.sortedPlugins[0].name).toBe('utils');
            // core зависит только от utils
            expect(result.sortedPlugins[1].name).toBe('core');
            // ui зависит от core и utils
            expect(result.sortedPlugins[2].name).toBe('ui');
            expect(result.hasCriticalIssues).toBe(false);
        });

        test('должен обработать множественные проблемы одновременно', () => {
            const allPlugins = [
                {
                    id: 1,
                    name: 'badPlugin',
                    version: '1.0.0',
                    manifest: JSON.stringify({
                        dependencies: {
                            missing: '^1.0.0',
                            wrongVersion: '^2.0.0',
                        },
                    }),
                },
                {
                    id: 2,
                    name: 'wrongVersion',
                    version: '1.0.0',
                    manifest: JSON.stringify({}),
                },
            ];

            const enabledPlugins = [allPlugins[0], allPlugins[1]];

            const result = DependencyService.resolveDependencies(enabledPlugins, allPlugins);

            expect(result.hasCriticalIssues).toBe(true);
            expect(result.pluginInfo[1].issues).toHaveLength(2);

            const issueTypes = result.pluginInfo[1].issues.map(i => i.type);
            expect(issueTypes).toContain('missing_dependency');
            expect(issueTypes).toContain('version_mismatch');
        });
    });
});
