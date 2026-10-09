function asSections(data) {
    if (Array.isArray(data)) return { official: data, unofficial: [] };
    if (data && typeof data === 'object') {
        return {
            official: Array.isArray(data.official) ? data.official : [],
            unofficial: Array.isArray(data.unofficial) ? data.unofficial : [],
        };
    }
    return { official: [], unofficial: [] };
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

function same(left, right) {
    return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function repoOwner(url) {
    const match = String(url || '').replace(/\.git$/i, '').match(/github\.com\/([^/]+)/i);
    return match ? match[1].toLowerCase() : '';
}

function validEntry(entry) {
    if (!entry || typeof entry !== 'object') return false;
    const required = ['id', 'name', 'author', 'description', 'repoUrl', 'icon', 'latestTag'];
    for (const key of required) {
        if (typeof entry[key] !== 'string' || !entry[key].trim()) return false;
    }
    if (!/^[a-z0-9][a-z0-9._-]{0,80}$/i.test(entry.id)) return false;
    const repoUrl = entry.repoUrl.replace(/\.git$/i, '').replace(/\/$/, '');
    return /^https:\/\/github\.com\/[^/]+\/[^/]+$/i.test(repoUrl);
}

function inspect(baseData, headData, authorLogin) {
    const base = asSections(baseData);
    const head = asSections(headData);
    if (!same(base.official, head.official)) return { ok: false, reason: 'official-changed' };

    const author = String(authorLogin || '').toLowerCase();
    const baseById = new Map(base.unofficial.filter((item) => item && item.id).map((item) => [item.id, item]));
    const seen = new Set();

    for (const entry of head.unofficial) {
        if (!validEntry(entry)) return { ok: false, reason: 'invalid-entry' };
        seen.add(entry.id);
        const previous = baseById.get(entry.id);
        if (previous && same(previous, entry)) continue;
        if (repoOwner(entry.repoUrl) !== author) return { ok: false, reason: 'author-mismatch' };
        if (previous && repoOwner(previous.repoUrl) !== author) return { ok: false, reason: 'entry-taken' };
        if (base.official.some((item) => item && item.id === entry.id)) return { ok: false, reason: 'official-id' };
    }

    let removedOwn = false;
    for (const id of baseById.keys()) {
        if (seen.has(id)) continue;
        if (repoOwner(baseById.get(id)?.repoUrl) !== author) return { ok: false, reason: 'entry-removed' };
        removedOwn = true;
    }

    const changed = removedOwn || head.unofficial.some((entry) => {
        const previous = baseById.get(entry.id);
        return !previous || !same(previous, entry);
    });
    if (!changed) return { ok: false, reason: 'no-unofficial-change' };
    return { ok: true };
}

function decodeContent(data) {
    return JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
}

async function accept({ github, context, core }) {
    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const pr = context.payload.pull_request;
    const files = await github.paginate(github.rest.pulls.listFiles, {
        owner,
        repo,
        pull_number: pr.number,
    });

    if (files.length !== 1 || files[0].filename !== 'index.json') {
        core.notice('PR меняет не только index.json, автоприём пропущен.');
        return { merged: false, reason: 'files' };
    }

    const baseFile = await github.rest.repos.getContent({
        owner,
        repo,
        path: 'index.json',
        ref: pr.base.sha,
    });
    const headFile = await github.rest.repos.getContent({
        owner,
        repo,
        path: 'index.json',
        ref: pr.head.sha,
    });

    const decision = inspect(decodeContent(baseFile.data), decodeContent(headFile.data), pr.user.login);
    if (!decision.ok) {
        core.notice(`Автоприём пропущен: ${decision.reason}`);
        return { merged: false, reason: decision.reason };
    }

    await github.rest.pulls.createReview({
        owner,
        repo,
        pull_number: pr.number,
        event: 'APPROVE',
        body: 'Неофициальная запись совпадает с автором репозитория.',
    });
    const merged = await github.rest.pulls.merge({
        owner,
        repo,
        pull_number: pr.number,
        merge_method: 'squash',
    });
    const { postChanges, diffCatalog } = require('./discord-changes');
    await postChanges(
        diffCatalog(decodeContent(baseFile.data), decodeContent(headFile.data)),
        {
            commitUrl: `https://github.com/${owner}/${repo}/commit/${merged.data.sha}`,
            pusher: pr.user.login,
            core,
        }
    );
    core.notice(`PR #${pr.number} принят как неофициальный плагин.`);
    return { merged: true };
}

module.exports = {
    asSections,
    inspect,
    validEntry,
    accept,
};
