const {
    SECRET_MASK,
    isSecretSetting,
    maskSecretValue,
    filterSecretSettings,
    isMaskedValue,
    prepareSettingsForSave
} = require('../core/utils/secretsFilter');

describe('secretsFilter', () => {
    describe('isSecretSetting', () => {
        it('должен определять секретную настройку', () => {
            expect(isSecretSetting({ secret: true })).toBe(true);
        });

        it('должен определять несекретную настройку', () => {
            expect(isSecretSetting({ secret: false })).toBe(false);
            expect(isSecretSetting({})).toBe(false);
            expect(isSecretSetting(null)).toBe(false);
        });
    });

    describe('maskSecretValue', () => {
        const secretConfig = { secret: true };
        const normalConfig = { secret: false };

        it('должен маскировать строковое значение', () => {
            expect(maskSecretValue('my-secret-key', secretConfig)).toBe(SECRET_MASK);
        });

        it('не должен маскировать несекретное значение', () => {
            expect(maskSecretValue('public-value', normalConfig)).toBe('public-value');
        });

        it('должен маскировать массив строк', () => {
            const result = maskSecretValue(['key1', 'key2', 'key3'], secretConfig);
            expect(result).toEqual([SECRET_MASK, SECRET_MASK, SECRET_MASK]);
        });

        it('должен маскировать объект', () => {
            const result = maskSecretValue({ key1: 'value1', key2: 'value2' }, secretConfig);
            expect(result).toEqual({ key1: SECRET_MASK, key2: SECRET_MASK });
        });

        it('должен возвращать null/undefined без изменений', () => {
            expect(maskSecretValue(null, secretConfig)).toBe(null);
            expect(maskSecretValue(undefined, secretConfig)).toBe(undefined);
            expect(maskSecretValue('', secretConfig)).toBe('');
        });
    });

    describe('filterSecretSettings', () => {
        it('должен фильтровать обычные настройки', () => {
            const settings = {
                apiKey: 'secret-key-123',
                username: 'john_doe',
                password: 'my-password'
            };

            const manifest = {
                apiKey: { type: 'string', secret: true },
                username: { type: 'string' },
                password: { type: 'string', secret: true }
            };

            const result = filterSecretSettings(settings, manifest, false);

            expect(result.apiKey).toBe(SECRET_MASK);
            expect(result.username).toBe('john_doe');
            expect(result.password).toBe(SECRET_MASK);
        });

        it('должен фильтровать группированные настройки', () => {
            const settings = {
                apiKey: 'secret-key-123',
                username: 'john_doe'
            };

            const manifest = {
                'Аутентификация': {
                    label: 'Настройки аутентификации',
                    apiKey: { type: 'string', secret: true },
                    username: { type: 'string' }
                }
            };

            const result = filterSecretSettings(settings, manifest, true);

            expect(result.apiKey).toBe(SECRET_MASK);
            expect(result.username).toBe('john_doe');
        });

        it('должен обрабатывать массивы секретов', () => {
            const settings = {
                apiKeys: ['key1', 'key2', 'key3']
            };

            const manifest = {
                apiKeys: { type: 'string[]', secret: true }
            };

            const result = filterSecretSettings(settings, manifest, false);

            expect(result.apiKeys).toEqual([SECRET_MASK, SECRET_MASK, SECRET_MASK]);
        });

        it('должен возвращать настройки без изменений если манифест пустой', () => {
            const settings = { apiKey: 'test' };
            const result = filterSecretSettings(settings, null, false);
            expect(result).toEqual(settings);
        });
    });

    describe('isMaskedValue', () => {
        it('должен определять замаскированную строку', () => {
            expect(isMaskedValue(SECRET_MASK)).toBe(true);
        });

        it('должен определять замаскированный массив', () => {
            expect(isMaskedValue([SECRET_MASK, SECRET_MASK])).toBe(true);
        });

        it('должен определять замаскированный объект', () => {
            expect(isMaskedValue({ key1: SECRET_MASK, key2: SECRET_MASK })).toBe(true);
        });

        it('должен определять незамаскированные значения', () => {
            expect(isMaskedValue('real-value')).toBe(false);
            expect(isMaskedValue(['key1', SECRET_MASK])).toBe(false);
            expect(isMaskedValue({ key1: 'value', key2: SECRET_MASK })).toBe(false);
        });
    });

    describe('prepareSettingsForSave', () => {
        it('должен сохранять существующие значения для замаскированных секретов', () => {
            const newSettings = {
                apiKey: SECRET_MASK,  // не изменилось
                username: 'new_user'  // изменилось
            };

            const existingSettings = {
                apiKey: 'old-secret-key',
                username: 'old_user'
            };

            const manifest = {
                apiKey: { type: 'string', secret: true },
                username: { type: 'string' }
            };

            const result = prepareSettingsForSave(newSettings, existingSettings, manifest, false);

            expect(result.apiKey).toBe('old-secret-key');  // сохранено старое
            expect(result.username).toBe('new_user');       // сохранено новое
        });

        it('должен сохранять новые значения секретов если они изменились', () => {
            const newSettings = {
                apiKey: 'new-secret-key',  // изменилось
                username: 'new_user'
            };

            const existingSettings = {
                apiKey: 'old-secret-key',
                username: 'old_user'
            };

            const manifest = {
                apiKey: { type: 'string', secret: true },
                username: { type: 'string' }
            };

            const result = prepareSettingsForSave(newSettings, existingSettings, manifest, false);

            expect(result.apiKey).toBe('new-secret-key');  // сохранено новое
            expect(result.username).toBe('new_user');
        });

        it('должен удалять ключи с маской если нет существующего значения', () => {
            const newSettings = {
                apiKey: SECRET_MASK,
                username: 'new_user'
            };

            const existingSettings = {
                username: 'old_user'
                // apiKey отсутствует
            };

            const manifest = {
                apiKey: { type: 'string', secret: true },
                username: { type: 'string' }
            };

            const result = prepareSettingsForSave(newSettings, existingSettings, manifest, false);

            expect(result.apiKey).toBeUndefined();  // удалено
            expect(result.username).toBe('new_user');
        });

        it('должен обрабатывать группированные настройки', () => {
            const newSettings = {
                apiKey: SECRET_MASK,
                password: 'new-password'
            };

            const existingSettings = {
                apiKey: 'old-key',
                password: 'old-password'
            };

            const manifest = {
                'Секретно': {
                    label: 'Секретные настройки',
                    apiKey: { type: 'string', secret: true },
                    password: { type: 'string', secret: true }
                }
            };

            const result = prepareSettingsForSave(newSettings, existingSettings, manifest, true);

            expect(result.apiKey).toBe('old-key');        // сохранено старое
            expect(result.password).toBe('new-password'); // сохранено новое
        });

        it('должен обрабатывать массивы секретов', () => {
            const newSettings = {
                apiKeys: [SECRET_MASK, SECRET_MASK]
            };

            const existingSettings = {
                apiKeys: ['key1', 'key2']
            };

            const manifest = {
                apiKeys: { type: 'string[]', secret: true }
            };

            const result = prepareSettingsForSave(newSettings, existingSettings, manifest, false);

            expect(result.apiKeys).toEqual(['key1', 'key2']);  // сохранены старые
        });
    });

    describe('интеграционные тесты', () => {
        it('должен корректно обрабатывать полный цикл read-update-save', () => {
            // Начальное состояние в БД
            const dbSettings = {
                apiKey: 'secret-api-key',
                username: 'john_doe',
                serverUrl: 'https://api.example.com'
            };

            const manifest = {
                apiKey: { type: 'string', secret: true },
                username: { type: 'string' },
                serverUrl: { type: 'string' }
            };

            // 1. Читаем настройки (GET)
            const settingsForFrontend = filterSecretSettings(dbSettings, manifest, false);
            expect(settingsForFrontend.apiKey).toBe(SECRET_MASK);
            expect(settingsForFrontend.username).toBe('john_doe');

            // 2. Пользователь изменяет только username на фронтенде
            const updatedFromFrontend = {
                apiKey: SECRET_MASK,  // не изменилось
                username: 'jane_doe', // изменилось
                serverUrl: 'https://api.example.com'
            };

            // 3. Сохраняем настройки (PUT)
            const settingsToSaveInDb = prepareSettingsForSave(
                updatedFromFrontend,
                dbSettings,
                manifest,
                false
            );

            // 4. Проверяем что apiKey не перезаписан маской
            expect(settingsToSaveInDb.apiKey).toBe('secret-api-key');  // оригинал сохранен
            expect(settingsToSaveInDb.username).toBe('jane_doe');       // новое значение
            expect(settingsToSaveInDb.serverUrl).toBe('https://api.example.com');
        });

        it('должен позволять изменять секретные значения', () => {
            const dbSettings = {
                apiKey: 'old-secret-key'
            };

            const manifest = {
                apiKey: { type: 'string', secret: true }
            };

            // 1. Читаем (маскируется)
            const forFrontend = filterSecretSettings(dbSettings, manifest, false);
            expect(forFrontend.apiKey).toBe(SECRET_MASK);

            // 2. Пользователь вводит новый ключ
            const newSettings = {
                apiKey: 'new-secret-key'
            };

            // 3. Сохраняем
            const toSave = prepareSettingsForSave(newSettings, dbSettings, manifest, false);
            expect(toSave.apiKey).toBe('new-secret-key');  // новое значение сохранено
        });
    });
});

