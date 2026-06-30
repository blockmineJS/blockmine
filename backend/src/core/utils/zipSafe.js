const path = require('path');

const DEFAULT_MAX_ENTRIES = 10000;
const DEFAULT_MAX_TOTAL_BYTES = 500 * 1024 * 1024;

function isEntrySafe(entryName, targetDir) {
    if (path.isAbsolute(entryName)) return false;
    const root = path.resolve(targetDir);
    const dest = path.resolve(root, entryName);
    return dest === root || dest.startsWith(root + path.sep);
}

function assertSafeZip(zip, targetDir) {
    const entries = typeof zip.getEntries === 'function' ? zip.getEntries() : [];
    for (const entry of entries) {
        if (!isEntrySafe(entry.entryName, targetDir)) {
            throw new Error(`Небезопасный путь в архиве: ${entry.entryName}`);
        }
    }
}

function assertArchiveLimits(zip, { maxEntries = DEFAULT_MAX_ENTRIES, maxTotalBytes = DEFAULT_MAX_TOTAL_BYTES } = {}) {
    const entries = typeof zip.getEntries === 'function' ? zip.getEntries() : [];

    if (entries.length > maxEntries) {
        const err = new Error(`Слишком много файлов в архиве: ${entries.length} (максимум ${maxEntries})`);
        err.statusCode = 400;
        throw err;
    }

    let totalBytes = 0;
    for (const entry of entries) {
        const size = (entry && entry.header && Number.isFinite(entry.header.size)) ? entry.header.size : 0;
        totalBytes += size;
        if (totalBytes > maxTotalBytes) {
            const err = new Error(`Распакованный размер архива превышает допустимый лимит (${maxTotalBytes} байт)`);
            err.statusCode = 400;
            throw err;
        }
    }
}

module.exports = { assertSafeZip, isEntrySafe, assertArchiveLimits };
