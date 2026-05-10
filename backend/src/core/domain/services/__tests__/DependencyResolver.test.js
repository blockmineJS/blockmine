const DependencyResolver = require('../DependencyResolver');

function makePlugin(name, version, deps = {}, optionalDeps = {}) {
    return {
        id: name,
        name,
        version,
        manifest: JSON.stringify({ dependencies: deps, optionalDependencies: optionalDeps }),
    };
}

describe('DependencyResolver', () => {
    let resolver;

    beforeEach(() => {
        resolver = new DependencyResolver();
    });

    describe('resolve', () => {
        it('returns empty sorted list for no plugins', () => {
            const result = resolver.resolve([], []);
            expect(result.sortedPlugins).toEqual([]);
            expect(result.hasCriticalIssues).toBe(false);
        });

        it('resolves plugins with no dependencies', () => {
            const plugins = [makePlugin('a', '1.0.0'), makePlugin('b', '2.0.0')];
            const result = resolver.resolve(plugins, plugins);
            expect(result.sortedPlugins).toHaveLength(2);
            expect(result.hasCriticalIssues).toBe(false);
        });

        it('sorts plugins in dependency order', () => {
            const a = makePlugin('a', '1.0.0');
            const b = makePlugin('b', '1.0.0', { a: '^1.0.0' });
            const result = resolver.resolve([a, b], [a, b]);
            const names = result.sortedPlugins.map(p => p.name);
            expect(names.indexOf('a')).toBeLessThan(names.indexOf('b'));
        });

        it('detects missing dependency', () => {
            const b = makePlugin('b', '1.0.0', { a: '^1.0.0' });
            const result = resolver.resolve([b], [b]);
            expect(result.hasCriticalIssues).toBe(true);
            expect(result.pluginInfo['b'].issues[0].type).toBe('missing_dependency');
        });

        it('detects disabled dependency', () => {
            const a = makePlugin('a', '1.0.0');
            const b = makePlugin('b', '1.0.0', { a: '^1.0.0' });
            const result = resolver.resolve([b], [a, b]);
            expect(result.pluginInfo['b'].issues[0].type).toBe('disabled_dependency');
        });

        it('detects version mismatch', () => {
            const a = makePlugin('a', '0.5.0');
            const b = makePlugin('b', '1.0.0', { a: '^1.0.0' });
            const result = resolver.resolve([a, b], [a, b]);
            expect(result.hasCriticalIssues).toBe(true);
            expect(result.pluginInfo['b'].issues[0].type).toBe('version_mismatch');
        });

        it('detects circular dependency', () => {
            const a = makePlugin('a', '1.0.0', { b: '^1.0.0' });
            const b = makePlugin('b', '1.0.0', { a: '^1.0.0' });
            const result = resolver.resolve([a, b], [a, b]);
            expect(result.hasCriticalIssues).toBe(true);
            const hasCircular = Object.values(result.pluginInfo).some(info =>
                info.issues.some(i => i.type === 'circular_dependency')
            );
            expect(hasCircular).toBe(true);
        });

        it('does not flag missing optional dependency as critical', () => {
            const b = makePlugin('b', '1.0.0', {}, { a: '^1.0.0' });
            const result = resolver.resolve([b], [b]);
            expect(result.hasCriticalIssues).toBe(false);
        });

        it('satisfies semver ranges ^, ~, >=', () => {
            const a1 = makePlugin('a', '1.2.3');
            const b1 = makePlugin('b', '1.0.0', { a: '^1.0.0' });
            expect(resolver.resolve([a1, b1], [a1, b1]).hasCriticalIssues).toBe(false);

            const a2 = makePlugin('a', '1.2.3');
            const b2 = makePlugin('b', '1.0.0', { a: '~1.2.0' });
            expect(resolver.resolve([a2, b2], [a2, b2]).hasCriticalIssues).toBe(false);

            const a3 = makePlugin('a', '2.0.0');
            const b3 = makePlugin('b', '1.0.0', { a: '>=1.0.0' });
            expect(resolver.resolve([a3, b3], [a3, b3]).hasCriticalIssues).toBe(false);
        });
    });

    describe('checkCompatibility', () => {
        it('returns compatible when all deps satisfied', () => {
            const a = makePlugin('a', '1.0.0');
            const b = makePlugin('b', '1.0.0', { a: '^1.0.0' });
            const result = resolver.checkCompatibility(b, [a]);
            expect(result.compatible).toBe(true);
            expect(result.issues).toHaveLength(0);
        });

        it('returns incompatible when dep missing', () => {
            const b = makePlugin('b', '1.0.0', { a: '^1.0.0' });
            const result = resolver.checkCompatibility(b, []);
            expect(result.compatible).toBe(false);
            expect(result.issues[0].type).toBe('missing_dependency');
        });

        it('returns incompatible when version mismatch', () => {
            const a = makePlugin('a', '0.5.0');
            const b = makePlugin('b', '1.0.0', { a: '^1.0.0' });
            const result = resolver.checkCompatibility(b, [a]);
            expect(result.compatible).toBe(false);
            expect(result.issues[0].type).toBe('version_mismatch');
        });

        it('includes suggestion in version mismatch issue', () => {
            const a = makePlugin('a', '0.5.0');
            const b = makePlugin('b', '1.0.0', { a: '^1.0.0' });
            const result = resolver.checkCompatibility(b, [a]);
            expect(result.issues[0].context.suggestion).toBeDefined();
        });
    });
});
