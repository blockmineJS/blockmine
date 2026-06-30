const dns = require('dns').promises;
const net = require('net');

function isPrivateIPv4(ip) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
}

function isPrivateIPv6(ip) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fe80')) return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIPv4(mapped[1]);
    return false;
}

function isPrivateIp(ip) {
    if (net.isIPv4(ip)) return isPrivateIPv4(ip);
    if (net.isIPv6(ip)) return isPrivateIPv6(ip);
    return true;
}

async function assertPublicUrl(rawUrl) {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new Error('Некорректный URL');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Разрешены только http/https URL');
    }
    const host = parsed.hostname;
    if (net.isIP(host)) {
        if (isPrivateIp(host)) throw new Error('Запросы к внутренним/приватным адресам запрещены');
        return;
    }
    const lowerHost = host.toLowerCase();
    if (lowerHost === 'localhost' || lowerHost.endsWith('.localhost')) {
        throw new Error('Запросы к localhost запрещены');
    }
    let addresses;
    try {
        addresses = await dns.lookup(host, { all: true });
    } catch {
        throw new Error('Не удалось разрешить имя хоста');
    }
    if (!addresses.length) throw new Error('Не удалось разрешить имя хоста');
    for (const a of addresses) {
        if (isPrivateIp(a.address)) {
            throw new Error('Запросы к внутренним/приватным адресам запрещены');
        }
    }
}

async function safeFetch(rawUrl, options = {}, { maxRedirects = 3 } = {}) {
    let currentUrl = rawUrl;
    for (let i = 0; i <= maxRedirects; i++) {
        await assertPublicUrl(currentUrl);
        const resp = await fetch(currentUrl, { ...options, redirect: 'manual' });
        if (resp.status >= 300 && resp.status < 400) {
            const location = resp.headers.get('location');
            if (location) {
                currentUrl = new URL(location, currentUrl).toString();
                continue;
            }
        }
        return resp;
    }
    throw new Error('Слишком много редиректов');
}

module.exports = { assertPublicUrl, safeFetch, isPrivateIp };
