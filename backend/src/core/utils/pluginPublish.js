const fse = require('fs-extra');
const path = require('path');
const { Octokit } = require('@octokit/rest');
const { tryParseGithubRepoUrl } = require('./github');
const { asSections, findListing, upsertUnofficial, bumpPatch, tagFor, repoOwner } = require('./pluginCatalog');

const LIST_OWNER = 'blockmineJS';
const LIST_REPO = 'official-plugins-list';

function fail(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function readRepoUrl(packageJson) {
    const repository = packageJson?.repository;
    if (!repository) return null;
    if (typeof repository === 'string') return repository;
    if (typeof repository.url === 'string') return repository.url;
    return null;
}

function parseRepo(repoUrl) {
    const parsed = tryParseGithubRepoUrl(repoUrl);
    if (parsed) return parsed;
    const match = String(repoUrl || '').match(/github\.com[/:]([^/]+)\/([^/#?]+)/i);
    if (!match) return null;
    return { owner: match[1], repo: match[2].replace(/\.git$/i, '') };
}

async function collectFiles(dir, baseDir, bucket) {
    const entries = await fse.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await collectFiles(fullPath, baseDir, bucket);
            continue;
        }
        const content = await fse.readFile(fullPath);
        bucket.push({
            path: path.relative(baseDir, fullPath).replace(/\\/g, '/'),
            content: content.toString('base64'),
        });
    }
}

async function uploadFiles(octokit, owner, repo, pluginPath) {
    const files = [];
    await collectFiles(pluginPath, pluginPath, files);
    if (files.length === 0) throw fail('В плагине нет файлов для публикации.');

    let empty = false;
    try {
        await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
    } catch (error) {
        if (error.status !== 404 && error.status !== 409) throw error;
        empty = true;
    }

    if (empty) {
        for (let index = 0; index < files.length; index += 1) {
            const file = files[index];
            await octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: file.path,
                message: `Add ${file.path}`,
                content: file.content,
                ...(index === 0 ? {} : { branch: 'main' }),
            });
        }
        return;
    }

    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
    const { data: commit } = await octokit.git.getCommit({ owner, repo, commit_sha: ref.object.sha });
    const blobs = await Promise.all(files.map(async (file) => {
        const { data } = await octokit.git.createBlob({
            owner,
            repo,
            content: file.content,
            encoding: 'base64',
        });
        return { path: file.path, mode: '100644', type: 'blob', sha: data.sha };
    }));
    const { data: tree } = await octokit.git.createTree({
        owner,
        repo,
        tree: blobs,
        base_tree: commit.tree.sha,
    });
    const { data: nextCommit } = await octokit.git.createCommit({
        owner,
        repo,
        message: 'Update plugin from BlockMine',
        tree: tree.sha,
        parents: [ref.object.sha],
    });
    await octokit.git.updateRef({
        owner,
        repo,
        ref: 'heads/main',
        sha: nextCommit.sha,
    });
}

async function tagExists(octokit, owner, repo, tag) {
    try {
        await octokit.git.getRef({ owner, repo, ref: `tags/${tag}` });
        return true;
    } catch (error) {
        if (error.status === 404) return false;
        throw error;
    }
}

async function createRelease(octokit, owner, repo, tag, body) {
    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
    const { data: tagObject } = await octokit.git.createTag({
        owner,
        repo,
        tag,
        message: `Release ${tag}`,
        object: ref.object.sha,
        type: 'commit',
    });
    await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/tags/${tag}`,
        sha: tagObject.sha,
    });
    const { data: release } = await octokit.repos.createRelease({
        owner,
        repo,
        tag_name: tag,
        name: tag,
        body: body || '',
        draft: false,
        prerelease: false,
    });
    return release.html_url;
}

async function ensureFork(octokit, login) {
    try {
        await octokit.repos.get({ owner: login, repo: LIST_REPO });
        return;
    } catch (error) {
        if (error.status !== 404) throw error;
    }

    await octokit.repos.createFork({ owner: LIST_OWNER, repo: LIST_REPO });
    for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
            await octokit.repos.get({ owner: login, repo: LIST_REPO });
            return;
        } catch (error) {
            if (error.status !== 404) throw error;
            await new Promise((resolve) => setTimeout(resolve, 1500));
        }
    }
    throw fail('Форк списка плагинов ещё не готов. Повторите публикацию через минуту.', 503);
}

async function commitUnofficialEntry(octokit, entry) {
    const { data: repoInfo } = await octokit.repos.get({ owner: LIST_OWNER, repo: LIST_REPO });
    if (!repoInfo.permissions?.push) return null;
    const branch = repoInfo.default_branch;
    const { data: fileData } = await octokit.repos.getContent({
        owner: LIST_OWNER,
        repo: LIST_REPO,
        path: 'index.json',
        ref: branch,
    });
    const current = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
    if (findListing(current, entry.id) === 'official') {
        return { skipped: true, listing: 'official', direct: true };
    }
    const next = upsertUnofficial(current, entry);
    await octokit.repos.createOrUpdateFileContents({
        owner: LIST_OWNER,
        repo: LIST_REPO,
        path: 'index.json',
        message: `Unofficial ${entry.name} ${entry.latestTag}`,
        content: Buffer.from(`${JSON.stringify(next, null, 2)}\n`).toString('base64'),
        sha: fileData.sha,
        branch,
    });
    return { skipped: false, direct: true, listing: 'unofficial' };
}

async function publishUnofficialEntry(octokit, entry) {
    const direct = await commitUnofficialEntry(octokit, entry);
    if (direct) return direct;
    return openUnofficialPullRequest(octokit, entry);
}

async function openUnofficialPullRequest(octokit, entry) {
    const { data: me } = await octokit.users.getAuthenticated();
    const { data: repoInfo } = await octokit.repos.get({ owner: LIST_OWNER, repo: LIST_REPO });
    const baseBranch = repoInfo.default_branch;
    const { data: baseRef } = await octokit.git.getRef({
        owner: LIST_OWNER,
        repo: LIST_REPO,
        ref: `heads/${baseBranch}`,
    });
    const { data: fileData } = await octokit.repos.getContent({
        owner: LIST_OWNER,
        repo: LIST_REPO,
        path: 'index.json',
        ref: baseBranch,
    });
    const current = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
    const listing = findListing(current, entry.id);
    if (listing === 'official') {
        return { skipped: true, listing: 'official' };
    }

    const next = upsertUnofficial(current, entry);
    const content = `${JSON.stringify(next, null, 2)}\n`;
    await ensureFork(octokit, me.login);

    const branch = `unofficial-${entry.id}-${entry.latestTag}`.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
    try {
        await octokit.git.deleteRef({ owner: me.login, repo: LIST_REPO, ref: `heads/${branch}` });
    } catch (error) {
        if (error.status !== 404 && error.status !== 422) throw error;
    }

    await octokit.git.createRef({
        owner: me.login,
        repo: LIST_REPO,
        ref: `refs/heads/${branch}`,
        sha: baseRef.object.sha,
    });

    const { data: branchFile } = await octokit.repos.getContent({
        owner: me.login,
        repo: LIST_REPO,
        path: 'index.json',
        ref: branch,
    });
    await octokit.repos.createOrUpdateFileContents({
        owner: me.login,
        repo: LIST_REPO,
        path: 'index.json',
        message: `Unofficial ${entry.name} ${entry.latestTag}`,
        content: Buffer.from(content).toString('base64'),
        branch,
        sha: branchFile.sha,
    });

    const head = `${me.login}:${branch}`;
    const title = `Unofficial: ${entry.displayName || entry.name} ${entry.latestTag}`;
    const body = [
        `Плагин \`${entry.id}\` отправлен в неофициальный раздел.`,
        '',
        `- Автор: ${entry.author}`,
        `- Репозиторий: ${entry.repoUrl}`,
        `- Версия: ${entry.latestTag}`,
    ].join('\n');

    try {
        const { data: pr } = await octokit.pulls.create({
            owner: LIST_OWNER,
            repo: LIST_REPO,
            title,
            head,
            base: baseBranch,
            body,
        });
        return { skipped: false, prUrl: pr.html_url, prNumber: pr.number, listing: 'unofficial' };
    } catch (error) {
        if (error.status !== 422) throw error;
        const { data: pulls } = await octokit.pulls.list({
            owner: LIST_OWNER,
            repo: LIST_REPO,
            head,
            state: 'open',
        });
        if (!pulls.length) throw error;
        return { skipped: false, prUrl: pulls[0].html_url, prNumber: pulls[0].number, listing: 'unofficial' };
    }
}

function catalogEntry(packageJson, repoUrl, tag, fields) {
    const botpanel = packageJson.botpanel || {};
    const ownerRepo = parseRepo(repoUrl);
    return {
        id: ownerRepo.repo,
        name: packageJson.name,
        displayName: fields.displayName || botpanel.displayName || packageJson.name,
        author: fields.author || (typeof packageJson.author === 'string' ? packageJson.author : packageJson.author?.name) || ownerRepo.owner,
        description: fields.description || packageJson.description || '',
        repoUrl: `https://github.com/${ownerRepo.owner}/${ownerRepo.repo}`,
        icon: fields.icon || botpanel.icon || 'package',
        latestTag: tag,
        categories: Array.isArray(botpanel.categories) ? botpanel.categories : [],
        supportedHosts: Array.isArray(botpanel.supportedHosts) ? botpanel.supportedHosts : [],
        dependencies: Array.isArray(botpanel.dependencies) ? botpanel.dependencies : [],
    };
}

async function inspectLocalPublish(pluginPath) {
    const packageJsonPath = path.join(pluginPath, 'package.json');
    if (!await fse.pathExists(packageJsonPath)) {
        return { published: false, version: '1.0.0', author: '', description: '', displayName: '', icon: 'package', repoUrl: null };
    }
    const packageJson = await fse.readJson(packageJsonPath);
    const parsed = parseRepo(readRepoUrl(packageJson));
    const botpanel = packageJson.botpanel && typeof packageJson.botpanel === 'object' ? packageJson.botpanel : {};
    const author = typeof packageJson.author === 'string' ? packageJson.author : (packageJson.author?.name || '');
    return {
        published: Boolean(parsed),
        repoUrl: parsed ? `https://github.com/${parsed.owner}/${parsed.repo}` : null,
        version: packageJson.version || '1.0.0',
        author,
        description: packageJson.description || '',
        displayName: botpanel.displayName || packageJson.name || '',
        icon: botpanel.icon || 'package',
    };
}

async function publishLocalPlugin({ token, pluginPath, pluginRecord, fields = {} }) {
    if (!token) throw fail('Сначала привяжите GitHub.');
    if (!pluginRecord || (pluginRecord.sourceType !== 'LOCAL' && pluginRecord.sourceType !== 'LOCAL_IDE')) {
        throw fail('Одной кнопкой публикуется только локальный плагин.');
    }

    const packageJsonPath = path.join(pluginPath, 'package.json');
    if (!await fse.pathExists(packageJsonPath)) throw fail('В плагине нет package.json.', 404);

    const packageJson = await fse.readJson(packageJsonPath);
    const existingRepo = readRepoUrl(packageJson);
    const alreadyPublished = Boolean(parseRepo(existingRepo));
    const author = String(fields.author || '').trim();
    const description = String(fields.description || '').trim();
    const displayName = String(fields.displayName || '').trim();
    const icon = String(fields.icon || '').trim() || 'package';

    if (!alreadyPublished) {
        if (!author) throw fail('Укажите автора.');
        if (!description) throw fail('Укажите описание.');
    }

    let version = packageJson.version || '1.0.0';
    const octokit = new Octokit({ auth: token });
    let owner;
    let repo;
    let repoUrl = existingRepo;

    if (!alreadyPublished) {
        const repoName = String(packageJson.name || pluginRecord.name || '').trim();
        if (!repoName) throw fail('У плагина нет имени.');
        const { data: created } = await octokit.repos.createForAuthenticatedUser({
            name: repoName,
            description: description.slice(0, 350),
            private: false,
            auto_init: false,
            homepage: 'https://github.com/blockmineJS',
        });
        owner = created.owner.login;
        repo = created.name;
        repoUrl = created.html_url;
        try {
            await octokit.repos.replaceAllTopics({
                owner,
                repo,
                names: ['blockmine', 'blockmine-plugin', 'minecraft', 'mineflayer', 'minecraft-bot'],
            });
        } catch {
        }
    } else {
        const parsed = parseRepo(existingRepo);
        owner = parsed.owner;
        repo = parsed.repo;
        repoUrl = `https://github.com/${owner}/${repo}`;
        const { data: repoInfo } = await octokit.repos.get({ owner, repo });
        if (repoInfo.permissions && !repoInfo.permissions.push) {
            throw fail(`Нет прав на запись в ${owner}/${repo}.`, 403);
        }
        let guard = 0;
        while (await tagExists(octokit, owner, repo, tagFor(version))) {
            version = bumpPatch(version);
            guard += 1;
            if (guard > 30) throw fail('Не удалось подобрать свободную версию.');
        }
    }

    packageJson.version = version;
    if (author) packageJson.author = author;
    if (description) packageJson.description = description;
    packageJson.repository = { type: 'git', url: repoUrl };
    packageJson.botpanel = packageJson.botpanel && typeof packageJson.botpanel === 'object' ? packageJson.botpanel : {};
    packageJson.botpanel.icon = icon;
    if (displayName) packageJson.botpanel.displayName = displayName;
    if (!Array.isArray(packageJson.keywords)) packageJson.keywords = [];
    for (const keyword of ['blockmine', 'blockmine-plugin', 'minecraft', 'mineflayer']) {
        if (!packageJson.keywords.includes(keyword)) packageJson.keywords.push(keyword);
    }
    await fse.writeJson(packageJsonPath, packageJson, { spaces: 2 });

    await uploadFiles(octokit, owner, repo, pluginPath);
    const tag = tagFor(version);
    const releaseUrl = await createRelease(octokit, owner, repo, tag, description || packageJson.description || '');
    const entry = catalogEntry(packageJson, repoUrl, tag, { author, description, displayName, icon });
    const pull = await publishUnofficialEntry(octokit, entry);

    return {
        mode: alreadyPublished ? 'updated' : 'created',
        version,
        tag,
        repoUrl: entry.repoUrl,
        releaseUrl,
        prUrl: pull.prUrl || null,
        prNumber: pull.prNumber || null,
        listing: pull.listing,
        direct: Boolean(pull.direct),
        prSkipped: Boolean(pull.skipped),
        manifest: {
            ...packageJson.botpanel,
            author: packageJson.author,
            description: packageJson.description,
        },
        description: packageJson.description || '',
    };
}

async function submitListedRelease({ token, pluginPath, displayName, icon }) {
    if (!token) throw fail('Сначала привяжите GitHub.');
    const packageJsonPath = path.join(pluginPath, 'package.json');
    if (!await fse.pathExists(packageJsonPath)) throw fail('package.json не найден.', 404);
    const packageJson = await fse.readJson(packageJsonPath);
    const repoUrl = readRepoUrl(packageJson);
    const parsed = parseRepo(repoUrl);
    if (!parsed) throw fail('В package.json нет ссылки на GitHub.');

    const octokit = new Octokit({ auth: token });
    const { data: tags } = await octokit.repos.listTags({ owner: parsed.owner, repo: parsed.repo, per_page: 1 });
    if (!tags.length) throw fail('Сначала создайте релиз. У плагина нет тегов.');

    if (!packageJson.botpanel || typeof packageJson.botpanel !== 'object') packageJson.botpanel = {};
    if (icon && !packageJson.botpanel.icon) {
        packageJson.botpanel.icon = icon;
        await fse.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    }

    const entry = catalogEntry(packageJson, `https://github.com/${parsed.owner}/${parsed.repo}`, tags[0].name, {
        displayName,
        icon,
    });
    const pull = await publishUnofficialEntry(octokit, entry);
    return {
        prUrl: pull.prUrl || null,
        prNumber: pull.prNumber || null,
        listing: pull.listing,
        direct: Boolean(pull.direct),
        prSkipped: Boolean(pull.skipped),
    };
}

async function removeOwnUnofficialEntry({ token, pluginId }) {
    if (!token) throw fail('Сначала подключите GitHub.');
    const octokit = new Octokit({ auth: token });
    const { data: me } = await octokit.users.getAuthenticated();
    const login = String(me.login || '').toLowerCase();
    if (!login) throw fail('GitHub не назвал аккаунт.', 403);

    const { data: repoInfo } = await octokit.repos.get({ owner: LIST_OWNER, repo: LIST_REPO });
    const branch = repoInfo.default_branch;
    const { data: fileData } = await octokit.repos.getContent({
        owner: LIST_OWNER,
        repo: LIST_REPO,
        path: 'index.json',
        ref: branch,
    });
    const current = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
    const sections = asSections(current);
    const entry = sections.unofficial.find((item) => item && (item.id === pluginId || item.name === pluginId));
    if (!entry) {
        const official = sections.official.some((item) => item && (item.id === pluginId || item.name === pluginId));
        if (official) throw fail('Официальный плагин из списка убирают вручную.', 403);
        throw fail('Этого плагина нет в неофициальном списке.', 404);
    }
    if (repoOwner(entry.repoUrl) !== login) {
        throw fail('Это не ваш плагин.', 403);
    }

    const next = {
        official: sections.official,
        unofficial: sections.unofficial.filter((item) => item && item.id !== entry.id),
    };
    const message = `Remove unofficial ${entry.id}`;
    const content = Buffer.from(`${JSON.stringify(next, null, 2)}\n`).toString('base64');

    if (repoInfo.permissions?.push) {
        await octokit.repos.createOrUpdateFileContents({
            owner: LIST_OWNER,
            repo: LIST_REPO,
            path: 'index.json',
            message,
            content,
            sha: fileData.sha,
            branch,
        });
        return { direct: true, removed: true, login: me.login };
    }

    await ensureFork(octokit, me.login);
    const prBranch = `remove-unofficial-${entry.id}`.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
    const { data: baseRef } = await octokit.git.getRef({
        owner: LIST_OWNER,
        repo: LIST_REPO,
        ref: `heads/${branch}`,
    });
    try {
        await octokit.git.deleteRef({ owner: me.login, repo: LIST_REPO, ref: `heads/${prBranch}` });
    } catch (error) {
        if (error.status !== 404 && error.status !== 422) throw error;
    }
    await octokit.git.createRef({
        owner: me.login,
        repo: LIST_REPO,
        ref: `refs/heads/${prBranch}`,
        sha: baseRef.object.sha,
    });
    const { data: branchFile } = await octokit.repos.getContent({
        owner: me.login,
        repo: LIST_REPO,
        path: 'index.json',
        ref: prBranch,
    });
    await octokit.repos.createOrUpdateFileContents({
        owner: me.login,
        repo: LIST_REPO,
        path: 'index.json',
        message,
        content,
        branch: prBranch,
        sha: branchFile.sha,
    });
    const head = `${me.login}:${prBranch}`;
    const { data: pr } = await octokit.pulls.create({
        owner: LIST_OWNER,
        repo: LIST_REPO,
        title: `Remove unofficial ${entry.id}`,
        head,
        base: branch,
        body: `Владелец репозитория убирает \`${entry.id}\` из неофициального списка.`,
    });
    return { direct: false, removed: true, prUrl: pr.html_url, prNumber: pr.number, login: me.login };
}

module.exports = {
    readRepoUrl,
    parseRepo,
    catalogEntry,
    upsertUnofficial,
    asSections,
    inspectLocalPublish,
    publishLocalPlugin,
    submitListedRelease,
    openUnofficialPullRequest,
    removeOwnUnofficialEntry,
};
