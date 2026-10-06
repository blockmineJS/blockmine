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

function clip(value, max) {
    const text = String(value || '').trim();
    if (!text) return 'нет';
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function listText(value) {
    if (!Array.isArray(value) || value.length === 0) return 'нет';
    return value.join(', ');
}

function showValue(value) {
    if (Array.isArray(value)) return listText(value);
    if (value === undefined || value === null || value === '') return 'нет';
    return String(value);
}

function changedLines(previous, entry) {
    const keys = ['name', 'displayName', 'author', 'description', 'repoUrl', 'icon', 'latestTag', 'categories', 'supportedHosts', 'dependencies'];
    const lines = [];
    for (const key of keys) {
        if (JSON.stringify(previous?.[key] ?? null) === JSON.stringify(entry?.[key] ?? null)) continue;
        lines.push(`**${key}:** ${showValue(previous?.[key])} → ${showValue(entry?.[key])}`);
    }
    return lines.join('\n') || 'запись изменена';
}

function embedFor(change, { commitUrl, pusher }) {
    const entry = change.entry;
    const label = sectionLabel(change.section);
    const action = change.type === 'added' ? 'добавлен' : change.type === 'removed' ? 'убран' : 'обновлён';
    const color = change.type === 'removed' ? 0xed4245 : change.type === 'updated' ? 0xfaa61a : (change.section === 'official' ? 0x5865f2 : 0x3ba55d);
    const fields = [
        { name: 'Автор', value: clip(entry.author, 1024), inline: true },
        { name: 'Версия', value: clip(entry.latestTag, 256), inline: true },
        { name: 'Иконка', value: clip(entry.icon, 256), inline: true },
        { name: 'Категории', value: clip(listText(entry.categories), 1024) },
        { name: 'Серверы', value: clip(listText(entry.supportedHosts), 1024) },
        { name: 'Зависимости', value: clip(listText(entry.dependencies), 1024) },
    ];
    if (change.type === 'updated') {
        fields.push({ name: 'Что изменилось', value: clip(changedLines(change.previous, entry), 1024) });
    }
    return {
        title: `${label} плагин ${action}: ${pluginTitle(entry)}`.slice(0, 256),
        url: entry.repoUrl || commitUrl,
        description: entry.description ? clip(entry.description, 4096) : 'Описания нет.',
        color,
        fields,
        footer: { text: [pusher, commitUrl].filter(Boolean).join(' · ').slice(0, 2048) },
    };
}

function buildPayloads(changes, meta) {
    const embeds = changes.map((change) => embedFor(change, meta));
    const payloads = [];
    for (let index = 0; index < embeds.length; index += 10) {
        payloads.push({ embeds: embeds.slice(index, index + 10) });
    }
    return payloads;
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
    const payloads = buildPayloads(changes, {
        commitUrl,
        pusher: context.payload.pusher?.name || '',
    });
    for (const payload of payloads) {
        const response = await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            core.setFailed(`Discord ответил ${response.status}`);
            return { sent: false, reason: String(response.status) };
        }
    }
    core.notice(`В Discord отправлено изменений: ${changes.length}`);
    return { sent: true, count: changes.length };
}

module.exports = {
    diffCatalog,
    buildPayloads,
    notify,
};
