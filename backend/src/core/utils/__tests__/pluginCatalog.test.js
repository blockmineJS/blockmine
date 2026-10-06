const { inspect } = require('../../../../../services/official-list-bot/accept-unofficial');
const { diffCatalog, buildPayloads } = require('../../../../../services/official-list-bot/discord-changes');
const {
    normalizeCatalog,
    isFloatingLatest,
    upsertUnofficial,
    findListing,
    unofficialChangeIsAutoAcceptable,
    bumpPatch,
    tagFor,
} = require('../pluginCatalog');

describe('plugin catalog sections', () => {
    const pinned = {
        id: 'alpha',
        name: 'alpha',
        latestTag: 'v1.0.0',
        repoUrl: 'https://github.com/merka/alpha',
    };

    test('an array catalog stays official', () => {
        const list = normalizeCatalog([pinned]);
        expect(list).toHaveLength(1);
        expect(list[0].listing).toBe('official');
    });

    test('sections keep official and unofficial apart', () => {
        const list = normalizeCatalog({
            official: [pinned],
            unofficial: [{ ...pinned, id: 'beta', name: 'beta', repoUrl: 'https://github.com/ada/beta' }],
        });
        expect(list.map((item) => item.listing)).toEqual(['official', 'unofficial']);
    });

    test('latest is a floating pin', () => {
        expect(isFloatingLatest('latest')).toBe(true);
        expect(isFloatingLatest('LATEST')).toBe(true);
        expect(isFloatingLatest('v1.2.3')).toBe(false);
    });

    test('unofficial upsert does not touch official', () => {
        const next = upsertUnofficial({ official: [pinned], unofficial: [] }, {
            id: 'beta',
            name: 'beta',
            latestTag: 'v0.1.0',
        });
        expect(next.official).toEqual([pinned]);
        expect(next.unofficial.map((item) => item.id)).toEqual(['beta']);
        expect(findListing(next, 'alpha')).toBe('official');
        expect(findListing(next, 'beta')).toBe('unofficial');
    });

    test('auto accept allows the repo owner to add an unofficial plugin', () => {
        const base = { official: [pinned], unofficial: [] };
        const head = {
            official: [{ ...pinned }],
            unofficial: [{
                id: 'beta',
                name: 'beta',
                author: 'ada',
                description: 'hello',
                repoUrl: 'https://github.com/ada/beta',
                icon: 'package',
                latestTag: 'v0.1.0',
            }],
        };
        expect(unofficialChangeIsAutoAcceptable(base, head, 'ada').ok).toBe(true);
        expect(unofficialChangeIsAutoAcceptable(base, head, 'eve').ok).toBe(false);
    });

    test('auto accept refuses official edits and deletions', () => {
        const base = {
            official: [pinned],
            unofficial: [{ id: 'beta', name: 'beta', repoUrl: 'https://github.com/ada/beta' }],
        };
        expect(unofficialChangeIsAutoAcceptable(
            base,
            { official: [{ ...pinned, latestTag: 'v9.0.0' }], unofficial: base.unofficial },
            'ada'
        ).reason).toBe('official-changed');
        expect(unofficialChangeIsAutoAcceptable(
            base,
            { official: [pinned], unofficial: [] },
            'ada'
        ).ok).toBe(true);
        expect(unofficialChangeIsAutoAcceptable(
            base,
            { official: [pinned], unofficial: [] },
            'eve'
        ).reason).toBe('entry-removed');
    });

    test('the list bot accepts only an owned unofficial change', () => {
        const base = { official: [pinned], unofficial: [] };
        const head = {
            official: [pinned],
            unofficial: [{
                id: 'beta',
                name: 'beta',
                author: 'ada',
                description: 'hello',
                repoUrl: 'https://github.com/ada/beta',
                icon: 'package',
                latestTag: 'v0.1.0',
            }],
        };
        expect(inspect(base, head, 'ada').ok).toBe(true);
        expect(inspect(base, head, 'eve').reason).toBe('author-mismatch');
        expect(inspect(base, { official: [pinned], unofficial: [] }, 'ada').reason).toBe('no-unofficial-change');
        const owned = {
            official: [pinned],
            unofficial: [{
                id: 'beta',
                name: 'beta',
                author: 'ada',
                description: 'hello',
                repoUrl: 'https://github.com/ada/beta',
                icon: 'package',
                latestTag: 'v0.1.0',
            }],
        };
        expect(inspect(owned, { official: [pinned], unofficial: [] }, 'ada').ok).toBe(true);
        expect(inspect(owned, { official: [pinned], unofficial: [] }, 'eve').reason).toBe('entry-removed');
        const hijack = {
            official: [pinned],
            unofficial: [{
                ...owned.unofficial[0],
                repoUrl: 'https://github.com/eve/beta',
            }],
        };
        expect(inspect(owned, hijack, 'eve').reason).toBe('entry-taken');
        expect(inspect(
            { official: [pinned], unofficial: [] },
            { official: [pinned], unofficial: [{ ...head.unofficial[0], id: pinned.id, name: pinned.name }] },
            'ada'
        ).reason).toBe('official-id');
    });

    test('discord diff sees an added unofficial plugin and a version change', () => {
        const before = { official: [pinned], unofficial: [] };
        const added = {
            id: 'beta',
            name: 'beta',
            repoUrl: 'https://github.com/ada/beta',
            latestTag: 'v0.1.0',
        };
        const changes = diffCatalog(before, { official: [pinned], unofficial: [added] });
        expect(changes).toEqual([{ type: 'added', section: 'unofficial', entry: added }]);
        const updated = diffCatalog(
            { official: [], unofficial: [added] },
            { official: [], unofficial: [{ ...added, latestTag: 'v0.2.0' }] }
        );
        expect(updated[0].type).toBe('updated');
        expect(updated[0].previous.latestTag).toBe('v0.1.0');
        const described = diffCatalog(before, {
            official: [pinned],
            unofficial: [{ ...added, description: 'Коротко о плагине', author: 'ada', categories: ['Чат'] }],
        });
        const embed = buildPayloads(described, { commitUrl: 'https://github.com/blockmineJS/official-plugins-list/commit/abc', pusher: 'ada' })[0].embeds[0];
        expect(embed.description).toBe('Коротко о плагине');
        expect(embed.fields.find((field) => field.name === 'Автор').value).toBe('ada');
        expect(embed.fields.find((field) => field.name === 'Категории').value).toBe('Чат');
    });

    test('version bump stays on the patch', () => {
        expect(bumpPatch('1.4.2')).toBe('1.4.3');
        expect(bumpPatch('v2')).toBe('2.0.1');
        expect(tagFor('1.4.3')).toBe('v1.4.3');
    });
});
