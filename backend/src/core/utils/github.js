const semver = require('semver');

const DEFAULT_TIMEOUT_MS = 10000;
const ARCHIVE_TIMEOUT_MS = 15000;
const GITHUB_OWNER_REPO_PATTERN = /^[A-Za-z0-9_.-]+$/;

function getGithubHeaders(extra = {}) {
    const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'BlockMine',
        ...extra,
    };
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    return headers;
}

function parseGithubRepoUrl(repoUrl) {
    if (typeof repoUrl !== 'string') {
        throw new Error('Repository URL is required.');
    }

    let trimmed = repoUrl.trim();
    if (!trimmed) {
        throw new Error('Repository URL is required.');
    }

    trimmed = trimmed.replace(/^git\+/i, '');

    const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
    if (sshMatch) {
        const owner = sshMatch[1];
        const repo = sshMatch[2];
        if (!GITHUB_OWNER_REPO_PATTERN.test(owner) || !GITHUB_OWNER_REPO_PATTERN.test(repo)) {
            throw new Error('GitHub repository URL contains unsupported owner or repository characters.');
        }
        return {
            owner,
            repo,
            normalizedUrl: `https://github.com/${owner}/${repo}`,
        };
    }

    if (/^github\.com\//i.test(trimmed)) {
        trimmed = `https://${trimmed}`;
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(trimmed);
    } catch {
        throw new Error('Invalid GitHub repository URL.');
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (!['github.com', 'www.github.com'].includes(hostname)) {
        throw new Error('Only GitHub repository links are supported.');
    }

    const pathParts = parsedUrl.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    if (pathParts.length < 2) {
        throw new Error('GitHub repository URL must include owner and repository name.');
    }

    const owner = pathParts[0];
    const repo = pathParts[1].replace(/\.git$/i, '');
    if (!GITHUB_OWNER_REPO_PATTERN.test(owner) || !GITHUB_OWNER_REPO_PATTERN.test(repo)) {
        throw new Error('GitHub repository URL contains unsupported owner or repository characters.');
    }

    return {
        owner,
        repo,
        normalizedUrl: `https://github.com/${owner}/${repo}`,
    };
}

function tryParseGithubRepoUrl(repoUrl) {
    try {
        return parseGithubRepoUrl(repoUrl);
    } catch {
        return null;
    }
}

function normalizeGithubRepoUrl(repoUrl) {
    return parseGithubRepoUrl(repoUrl).normalizedUrl;
}

function tryNormalizeGithubRepoUrl(repoUrl) {
    return tryParseGithubRepoUrl(repoUrl)?.normalizedUrl || null;
}

function getGithubRepoName(repoUrl) {
    return tryParseGithubRepoUrl(repoUrl)?.repo || null;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...options,
            headers: getGithubHeaders(options.headers || {}),
            signal: controller.signal,
        });
        return response;
    } catch (error) {
        if (error.name === 'AbortError') {
            const timeoutError = new Error('GitHub request timed out.');
            timeoutError.name = 'AbortError';
            throw timeoutError;
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function fetchGithubJson(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const response = await fetchWithTimeout(url, {}, timeoutMs);
    if (!response.ok) {
        const error = new Error(`GitHub API request failed with status ${response.status}.`);
        error.status = response.status;
        throw error;
    }
    return response.json();
}

async function fetchGithubJsonSafe(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
    try {
        return await fetchGithubJson(url, timeoutMs);
    } catch {
        return null;
    }
}

async function fetchGithubRepoInfo(repoUrl) {
    const ownerRepo = tryParseGithubRepoUrl(repoUrl);
    if (!ownerRepo) return null;
    return fetchGithubJsonSafe(`https://api.github.com/repos/${ownerRepo.owner}/${ownerRepo.repo}`);
}

async function downloadGithubArchive(repoUrl, ref) {
    const ownerRepo = parseGithubRepoUrl(repoUrl);
    const response = await fetchWithTimeout(
        `https://api.github.com/repos/${ownerRepo.owner}/${ownerRepo.repo}/zipball/${encodeURIComponent(ref)}`,
        { headers: { Accept: 'application/vnd.github+json' } },
        ARCHIVE_TIMEOUT_MS
    );
    if (!response.ok) {
        const error = new Error(`GitHub request failed with status ${response.status}.`);
        error.status = response.status;
        throw error;
    }
    return response;
}

async function fetchGithubPackageVersion(repoUrl, ref = null) {
    const ownerRepo = tryParseGithubRepoUrl(repoUrl);
    if (!ownerRepo) return null;

    const resolvedRef = ref || (await fetchGithubRepoInfo(repoUrl))?.default_branch;
    if (!resolvedRef) return null;

    const packageJsonData = await fetchGithubJsonSafe(
        `https://api.github.com/repos/${ownerRepo.owner}/${ownerRepo.repo}/contents/package.json?ref=${encodeURIComponent(resolvedRef)}`
    );

    if (!packageJsonData?.content) {
        return null;
    }

    try {
        const packageJsonRaw = Buffer.from(packageJsonData.content, packageJsonData.encoding || 'base64').toString('utf8');
        const packageJson = JSON.parse(packageJsonRaw);
        return typeof packageJson?.version === 'string' ? packageJson.version : null;
    } catch {
        return null;
    }
}

async function fetchLatestGithubVersionTag(repoUrl) {
    const ownerRepo = tryParseGithubRepoUrl(repoUrl);
    if (!ownerRepo) return null;

    const releaseData = await fetchGithubJsonSafe(`https://api.github.com/repos/${ownerRepo.owner}/${ownerRepo.repo}/releases/latest`);
    const releaseTag = typeof releaseData?.tag_name === 'string' ? releaseData.tag_name : null;
    if (releaseTag) return releaseTag;

    const tagsData = await fetchGithubJsonSafe(`https://api.github.com/repos/${ownerRepo.owner}/${ownerRepo.repo}/tags?per_page=20`);
    if (!Array.isArray(tagsData) || tagsData.length === 0) return null;

    const semverTags = tagsData
        .map((item) => item?.name)
        .filter(Boolean)
        .map((tag) => ({ tag, normalized: semver.coerce(tag)?.version || null }))
        .filter((item) => item.normalized);

    if (semverTags.length > 0) {
        semverTags.sort((a, b) => semver.rcompare(a.normalized, b.normalized));
        return semverTags[0].tag;
    }

    const firstTag = tagsData[0]?.name;
    return typeof firstTag === 'string' ? firstTag : null;
}

async function fetchLatestGithubReleaseBody(repoUrl) {
    const ownerRepo = tryParseGithubRepoUrl(repoUrl);
    if (!ownerRepo) return null;

    const release = await fetchGithubJsonSafe(`https://api.github.com/repos/${ownerRepo.owner}/${ownerRepo.repo}/releases/latest`);
    return typeof release?.body === 'string' ? release.body : null;
}

async function fetchGithubReadme(owner, repo) {
    const response = await fetchWithTimeout(
        `https://api.github.com/repos/${owner}/${repo}/readme`,
        { headers: { Accept: 'application/vnd.github.raw+json' } }
    );
    if (!response.ok) return null;
    return response.text();
}

async function renderGithubMarkdown(markdown, owner, repo) {
    if (!markdown) return null;
    const response = await fetchWithTimeout(
        'https://api.github.com/markdown',
        {
            method: 'POST',
            headers: {
                Accept: 'text/html',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: markdown,
                mode: 'gfm',
                context: `${owner}/${repo}`,
            }),
        }
    );
    if (!response.ok) return null;
    return response.text();
}

module.exports = {
    GITHUB_OWNER_REPO_PATTERN,
    DEFAULT_TIMEOUT_MS,
    ARCHIVE_TIMEOUT_MS,
    getGithubHeaders,
    parseGithubRepoUrl,
    tryParseGithubRepoUrl,
    normalizeGithubRepoUrl,
    tryNormalizeGithubRepoUrl,
    getGithubRepoName,
    fetchWithTimeout,
    fetchGithubJson,
    fetchGithubJsonSafe,
    fetchGithubRepoInfo,
    downloadGithubArchive,
    fetchGithubPackageVersion,
    fetchLatestGithubVersionTag,
    fetchLatestGithubReleaseBody,
    fetchGithubReadme,
    renderGithubMarkdown,
};
