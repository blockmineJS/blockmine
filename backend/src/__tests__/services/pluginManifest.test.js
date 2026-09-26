const { pluginDependencySatisfied, diffSettings, listDeclaredPermissions } = require('../../core/utils/pluginManifest');

describe('pluginManifest', () => {
    test('semver диапазон плагина', () => {
        expect(pluginDependencySatisfied('1.2.0', '^1.0.0')).toBe(true);
        expect(pluginDependencySatisfied('2.0.0', '^1.0.0')).toBe(false);
        expect(pluginDependencySatisfied('1.0.0', '*')).toBe(true);
    });

    test('переименование настройки по одинаковому label', () => {
        const diff = diffSettings(
            { muteReason: { type: 'string', label: 'Причина' } },
            { reason: { type: 'string', label: 'Причина' } },
        );
        expect(diff.renamed).toEqual([{ from: 'muteReason', to: 'reason', label: 'Причина' }]);
        expect(diff.added).toEqual([]);
        expect(diff.removed).toEqual([]);
    });

    test('permissions из манифеста без пустых имён', () => {
        expect(listDeclaredPermissions({
            permissions: [
                { name: ' clan.mute ', description: 'Мут' },
                { name: '' },
                null,
            ],
        })).toEqual([{ name: 'clan.mute', description: 'Мут' }]);
    });
});
