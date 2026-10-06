function stripListing(item) {
    if (!item || typeof item !== 'object') return item;
    const copy = { ...item };
    delete copy.listing;
    return copy;
}

function asSections(data) {
    if (Array.isArray(data)) {
        return {
            official: data.map(stripListing),
            unofficial: [],
        };
    }

    if (data && typeof data === 'object') {
        const official = Array.isArray(data.official) ? data.official.map(stripListing) : [];
        const unofficial = Array.isArray(data.unofficial) ? data.unofficial.map(stripListing) : [];
        return { official, unofficial };
    }

    return { official: [], unofficial: [] };
}

function normalizeCatalog(data) {
    const { official, unofficial } = asSections(data);
    return [
        ...official.map((item) => ({ ...item, listing: 'official' })),
        ...unofficial.map((item) => ({ ...item, listing: 'unofficial' })),
    ];
}

function isFloatingLatest(tag) {
    return typeof tag === 'string' && tag.trim().toLowerCase() === 'latest';
}

function bumpPatch(version) {
    const clean = String(version || '1.0.0').trim().replace(/^v/i, '');
    const parts = clean.split('.').map((part) => parseInt(part, 10));
    const major = Number.isFinite(parts[0]) ? parts[0] : 1;
    const minor = Number.isFinite(parts[1]) ? parts[1] : 0;
    const patch = Number.isFinite(parts[2]) ? parts[2] : 0;
    return `${major}.${minor}.${patch + 1}`;
}

function tagFor(version) {
    return `v${String(version).replace(/^v/i, '')}`;
}

function upsertUnofficial(data, entry) {
    const sections = asSections(data);
    const id = entry?.id;
    const index = sections.unofficial.findIndex((item) => item && item.id === id);
    if (index === -1) {
        sections.unofficial.push(entry);
    } else {
        sections.unofficial[index] = { ...sections.unofficial[index], ...entry };
    }
    sections.unofficial.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return sections;
}

function findListing(data, id) {
    const sections = asSections(data);
    if (sections.official.some((item) => item && item.id === id)) return 'official';
    if (sections.unofficial.some((item) => item && item.id === id)) return 'unofficial';
    return null;
}

function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
        return Object.keys(value).sort().reduce((acc, key) => {
            acc[key] = canonical(value[key]);
            return acc;
        }, {});
    }
    return value;
}

function repoOwner(url) {
    const match = String(url || '').match(/github\.com\/([^/]+)/i);
    return match ? match[1].toLowerCase() : '';
}

function sameCanonical(left, right) {
    return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function unofficialChangeIsAutoAcceptable(baseData, headData, authorLogin) {
    const base = asSections(baseData);
    const head = asSections(headData);
    if (!sameCanonical(base.official, head.official)) {
        return { ok: false, reason: 'official-changed' };
    }

    const author = String(authorLogin || '').toLowerCase();
    const baseById = new Map(base.unofficial.filter((item) => item && item.id).map((item) => [item.id, item]));
    const seen = new Set();

    for (const entry of head.unofficial) {
        if (!entry || typeof entry.id !== 'string' || !entry.id) {
            return { ok: false, reason: 'invalid-entry' };
        }
        seen.add(entry.id);
        const previous = baseById.get(entry.id);
        if (previous && sameCanonical(previous, entry)) continue;
        if (repoOwner(entry.repoUrl) !== author) {
            return { ok: false, reason: 'author-mismatch' };
        }
        if (previous && repoOwner(previous.repoUrl) !== author) {
            return { ok: false, reason: 'entry-taken' };
        }
        if (base.official.some((item) => item && item.id === entry.id)) {
            return { ok: false, reason: 'official-id' };
        }
    }

    for (const id of baseById.keys()) {
        if (seen.has(id)) continue;
        if (repoOwner(baseById.get(id)?.repoUrl) !== author) return { ok: false, reason: 'entry-removed' };
    }

    return { ok: true };
}

module.exports = {
    asSections,
    normalizeCatalog,
    isFloatingLatest,
    bumpPatch,
    tagFor,
    upsertUnofficial,
    findListing,
    canonical,
    repoOwner,
    unofficialChangeIsAutoAcceptable,
};
