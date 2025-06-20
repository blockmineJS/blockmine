const crypto = require('crypto');
const config = require('../../config');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;


function getEncryptionKey() {
    const key = config.security.encryptionKey;
    if (!key || key.length !== 64) {
        throw new Error('[Crypto] Ключ шифрования не настроен или имеет неверную длину в config.json');
    }
    return Buffer.from(key, 'hex');
}


function encrypt(text) {
    if (!text) return null;
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();
        
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (error) {
        throw new Error(`[Crypto] Ошибка шифрования: ${error.message}`);
    }
}

function decrypt(hash) {
    if (!hash) return null;
    try {
        const parts = hash.split(':');
        if (parts.length !== 3) {
            return hash; 
        }

        const key = getEncryptionKey();
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = Buffer.from(parts[2], 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (error) {
        throw new Error(`[Crypto] Ошибка дешифрования. Возможно, ключ был изменен или данные повреждены. ${error.message}`);
    }
}

module.exports = { encrypt, decrypt };