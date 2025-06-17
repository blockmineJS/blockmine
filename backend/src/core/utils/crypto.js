
const crypto = require('crypto');
const config = require('../../config');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY = Buffer.from(config.security.encryptionKey, 'hex');

function encrypt(text) {
    if (!text) return null;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
        const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();
        
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (error) {
        console.error('[Crypto] Ошибка шифрования:', error);
        return null;
    }
}

function decrypt(hash) {
    if (!hash) return null;
    try {
        const parts = hash.split(':');
        if (parts.length !== 3) {
            console.error('[Crypto] Неверный формат зашифрованных данных. Возвращаем как есть.');
            return hash;
        }

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = Buffer.from(parts[2], 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
        decipher.setAuthTag(authTag);
        
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (error) {
        console.error('[Crypto] Ошибка дешифрования. Возможно, ключ был изменен или данные повреждены.', error);
        return null;
    }
}

module.exports = { encrypt, decrypt };