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

function diffSection(before, after, section) {
    const previous = new Map((before || []).filter((item) => item && item.id).map((item) => [item.id, item]));
    const next = new Map((after || []).filter((item) => item && item.id).map((item) => [item.id, item]));
    const changes = [];
    for (const [id, entry] of next) {
        const old = previous.get(id);
        if (!old) {
            changes.push({ type: 'added', section, entry });
            continue;
        }
        if (!same(old, entry)) changes.push({ type: 'updated', section, entry, previous: old });
    }
    for (const [id, entry] of previous) {
        if (!next.has(id)) changes.push({ type: 'removed', section, entry });
    }
    return changes;
}

function diffCatalog(beforeData, afterData) {
    const before = asSections(beforeData);
    const after = asSections(afterData);
    return [
        ...diffSection(before.official, after.official, 'official'),
        ...diffSection(before.unofficial, after.unofficial, 'unofficial'),
    ];
}

function sectionLabel(section) {
    return section === 'official' ? 'Официальный' : 'Неофициальный';
}

function pluginTitle(entry) {
    return entry.displayName || entry.name || entry.id;
}

function describe(change) {
    const title = pluginTitle(change.entry);
    const label = sectionLabel(change.section);
    if (change.type === 'added') {
        return `**${label} добавлен:** ${title} \`${change.entry.latestTag || ''}\`\n${change.entry.repoUrl || ''}`;
    }
    if (change.type === 'removed') {
        return `**${label} убран:** ${title}\n${change.entry.repoUrl || ''}`;
    }
    const from = change.previous?.latestTag || '';
    const to = change.entry.latestTag || '';
    const version = from !== to ? ` \`${from}\` → \`${to}\`` : '';
    return `**${label} обновлён:** ${title}${version}\n${change.entry.repoUrl || ''}`;
}

function buildPayload(changes, { commitUrl, pusher }) {
    const description = changes.map(describe).join('\n\n').slice(0, 3900);
    return {
        embeds: [{
            title: 'Список плагинов',
            url: commitUrl,
            description,
            color: 0x3ba55d,
            footer: pusher ? { text: pusher } : undefined,
        }],
    };
}

function decodeContent(data) {
    return JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
}

async function notify({ github, context, core }) {
    const webhook = process.env.DISCORD_WEBHOOK_URL;
    if (!webhook) {
        core.notice('Discord webhook не задан.');
        return { sent: false, reason: 'no-webhook' };
    }
    const before = context.payload.before;
    if (!before || /^0+$/.test(before)) return { sent: false, reason: 'no-parent' };

    const { owner, repo } = context.repo;
    const load = async (ref) => {
        const file = await github.rest.repos.getContent({ owner, repo, path: 'index.json', ref });
        return decodeContent(file.data);
    };
    let previous;
    try {
        previous = await load(before);
    } catch {
        previous = { official: [], unofficial: [] };
    }
    const current = await load(context.sha);
    const changes = diffCatalog(previous, current);
    if (!changes.length) return { sent: false, reason: 'no-changes' };

    const commitUrl = `https://github.com/${owner}/${repo}/commit/${context.sha}`;
    const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(changes, {
            commitUrl,
            pusher: context.payload.pusher?.name || '',
        })),
    });
    if (!response.ok) {
        const text = await response.text();
        core.setFailed(`Discord ответил ${response.status}`);
        return { sent: false, reason: text.slice(0, 200) };
    }
    core.notice(`В Discord отправлено изменений: ${changes.length}`);
    return { sent: true, count: changes.length };
}

module.exports = {
    diffCatalog,
    buildPayload,
    notify,
};
