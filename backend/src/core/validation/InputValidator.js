const SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;

const DANGEROUS_PATTERNS = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<[^>]+on\w+\s*=\s*["'][^"']*["'][^>]*>/gi,
    /javascript\s*:/gi,
    /vbscript\s*:/gi,
    /union\s+select/gi,
    /drop\s+table/gi,
    /insert\s+into/gi,
    /delete\s+from/gi,
    /update\s+\w+\s+set/gi,
    /exec\s*\(/gi,
    /xp_cmdshell/gi,
    /\.\.[/\\]/g,
    /[/\\]\.\./g,
];

function sanitizeString(value) {
    if (typeof value !== 'string') return '';
    let result = value;
    for (const pattern of DANGEROUS_PATTERNS) {
        result = result.replace(pattern, '');
    }
    return result;
}

function validateString(value, options = {}) {
    const { minLength, maxLength, pattern, required } = options;

    if (value === undefined || value === null || value === '') {
        if (required) {
            return { valid: false, value: '', error: 'validation.string.required' };
        }
        return { valid: true, value: '' };
    }

    if (typeof value !== 'string') {
        return { valid: false, value: '', error: 'validation.string.type' };
    }

    const sanitized = sanitizeString(value);

    if (minLength !== undefined && sanitized.length < minLength) {
        return { valid: false, value: sanitized, error: 'validation.string.minLength' };
    }

    if (maxLength !== undefined && sanitized.length > maxLength) {
        return { valid: false, value: sanitized, error: 'validation.string.maxLength' };
    }

    if (pattern !== undefined && !pattern.test(sanitized)) {
        return { valid: false, value: sanitized, error: 'validation.string.pattern' };
    }

    return { valid: true, value: sanitized };
}

function validateInteger(value, options = {}) {
    const { min, max, required } = options;

    if (value === undefined || value === null || value === '') {
        if (required) {
            return { valid: false, value: 0, error: 'validation.integer.required' };
        }
        return { valid: true, value: 0 };
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed)) {
        return { valid: false, value: 0, error: 'validation.integer.type' };
    }

    if (min !== undefined && parsed < min) {
        return { valid: false, value: parsed, error: 'validation.integer.min' };
    }

    if (max !== undefined && parsed > max) {
        return { valid: false, value: parsed, error: 'validation.integer.max' };
    }

    return { valid: true, value: parsed };
}

function validatePluginManifest(manifest) {
    const errors = [];

    if (!manifest || typeof manifest !== 'object') {
        return { valid: false, errors: ['validation.manifest.type'] };
    }

    if (!manifest.name || typeof manifest.name !== 'string' || manifest.name.trim() === '') {
        errors.push('validation.manifest.name.required');
    }

    if (!manifest.version || typeof manifest.version !== 'string') {
        errors.push('validation.manifest.version.required');
    } else if (!SEMVER_PATTERN.test(manifest.version)) {
        errors.push('validation.manifest.version.semver');
    }

    if (!manifest.main || typeof manifest.main !== 'string' || manifest.main.trim() === '') {
        errors.push('validation.manifest.main.required');
    }

    if (manifest.description !== undefined && typeof manifest.description !== 'string') {
        errors.push('validation.manifest.description.type');
    }

    if (manifest.dependencies !== undefined && (typeof manifest.dependencies !== 'object' || Array.isArray(manifest.dependencies))) {
        errors.push('validation.manifest.dependencies.type');
    }

    if (manifest.settings !== undefined && (typeof manifest.settings !== 'object' || Array.isArray(manifest.settings))) {
        errors.push('validation.manifest.settings.type');
    }

    return { valid: errors.length === 0, errors };
}

function validateBotConfig(config) {
    const errors = [];

    if (!config || typeof config !== 'object') {
        return { valid: false, errors: ['validation.botConfig.type'] };
    }

    const hostResult = validateString(config.host, { required: true, minLength: 1 });
    if (!hostResult.valid) {
        errors.push('validation.botConfig.host.required');
    }

    const portResult = validateInteger(config.port, { required: true, min: 1, max: 65535 });
    if (!portResult.valid) {
        errors.push(portResult.error === 'validation.integer.required'
            ? 'validation.botConfig.port.required'
            : 'validation.botConfig.port.range');
    }

    const usernameResult = validateString(config.username, { required: true, minLength: 1 });
    if (!usernameResult.valid) {
        errors.push('validation.botConfig.username.required');
    }

    if (config.password !== undefined && typeof config.password !== 'string') {
        errors.push('validation.botConfig.password.type');
    }

    if (config.version !== undefined && typeof config.version !== 'string') {
        errors.push('validation.botConfig.version.type');
    }

    if (config.proxy !== undefined && typeof config.proxy !== 'object') {
        errors.push('validation.botConfig.proxy.type');
    }

    return { valid: errors.length === 0, errors };
}

module.exports = {
    validateString,
    validateInteger,
    validatePluginManifest,
    validateBotConfig,
    sanitizeString,
};
