const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const AUDIT_LOG_DIR = path.join(os.homedir(), '.blockmine', 'logs');
const AUDIT_LOG_FILE = path.join(AUDIT_LOG_DIR, 'audit.log');

class AuditLogger {
    constructor({ logFile = AUDIT_LOG_FILE } = {}) {
        this.logFile = logFile;
        this._ensureDir();
    }

    _ensureDir() {
        const dir = path.dirname(this.logFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    log(event) {
        const entry = {
            timestamp: new Date().toISOString(),
            ...event,
        };

        const line = JSON.stringify(entry);
        const hash = crypto.createHash('sha256').update(line).digest('hex');
        const record = JSON.stringify({ ...entry, _hash: hash }) + '\n';

        try {
            fs.appendFileSync(this.logFile, record, 'utf8');
        } catch {}
    }

    authFailure({ userId, username, ip, reason }) {
        this.log({ type: 'auth.failure', userId, username, ip, reason });
    }

    authSuccess({ userId, username, ip }) {
        this.log({ type: 'auth.success', userId, username, ip });
    }

    authorizationFailure({ userId, username, resource, action, ip }) {
        this.log({ type: 'authorization.failure', userId, username, resource, action, ip });
    }

    sensitiveAction({ userId, username, action, resource, ip }) {
        this.log({ type: 'sensitive.action', userId, username, action, resource, ip });
    }
}

let instance = null;

function getAuditLogger() {
    if (!instance) instance = new AuditLogger();
    return instance;
}

module.exports = { AuditLogger, getAuditLogger };
