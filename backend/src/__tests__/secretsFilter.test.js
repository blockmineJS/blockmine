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

        it('должен маскировать числовое значение', () => {
            expect(maskSecretValue(12345, secretConfig)).toBe(SECRET_MASK);
            expect(maskSecretValue(0, secretConfig)).toBe(SECRET_MASK);
            expect(maskSecretValue(-999, secretConfig)).toBe(SECRET_MASK);
        });

        it('должен маскировать булево значение', () => {
            expect(maskSecretValue(true, secretConfig)).toBe(SECRET_MASK);
            expect(maskSecretValue(false, secretConfig)).toBe(SECRET_MASK);
        });

        it('не должен маскировать несекретные числа и булевы значения', () => {
            expect(maskSecretValue(12345, normalConfig)).toBe(12345);
            expect(maskSecretValue(true, normalConfig)).toBe(true);
            expect(maskSecretValue(false, normalConfig)).toBe(false);
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

        it('должен возвращать false для пустого массива', () => {
            expect(isMaskedValue([])).toBe(false);
        });

        it('должен возвращать false для пустого объекта', () => {
            expect(isMaskedValue({})).toBe(false);
        });

        it('должен возвращать false для массива с замаскированным и незамаскированным значением', () => {
            expect(isMaskedValue([SECRET_MASK, 'real-value'])).toBe(false);
            expect(isMaskedValue(['real-value', SECRET_MASK])).toBe(false);
            expect(isMaskedValue([SECRET_MASK, null])).toBe(false);
        });

        it('должен возвращать false для объекта с замаскированным и незамаскированным значением', () => {
            expect(isMaskedValue({ key1: SECRET_MASK, key2: 'real-value' })).toBe(false);
            expect(isMaskedValue({ key1: 'real-value', key2: SECRET_MASK })).toBe(false);
            expect(isMaskedValue({ key1: SECRET_MASK, key2: null })).toBe(false);
        });

        it('должен возвращать false для массива с разными типами', () => {
            expect(isMaskedValue([SECRET_MASK, 123, true])).toBe(false);
        });

        it('должен возвращать false для объекта с разными типами', () => {
            expect(isMaskedValue({ key1: SECRET_MASK, key2: 123, key3: true })).toBe(false);
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

        it('должен обрабатывать смешанные массивы (замаскированные и новые значения)', () => {
            const newSettings = {
                apiKeys: ['new-key-1', 'new-key-2', 'new-key-3'],
                passwords: [SECRET_MASK, SECRET_MASK]
            };

            const existingSettings = {
                apiKeys: ['old-key-1', 'old-key-2'],
                passwords: ['old-pass-1', 'old-pass-2']
            };

            const manifest = {
                apiKeys: { type: 'string[]', secret: true },
                passwords: { type: 'string[]', secret: true }
            };

            const result = prepareSettingsForSave(newSettings, existingSettings, manifest, false);

            expect(result.apiKeys).toEqual(['new-key-1', 'new-key-2', 'new-key-3']);  // новые сохранены
            expect(result.passwords).toEqual(['old-pass-1', 'old-pass-2']);  // старые сохранены
        });

        it('должен обрабатывать смешанные объекты (замаскированные и новые значения)', () => {
            const newSettings = {
                secretObj: { key1: SECRET_MASK, key2: SECRET_MASK },
                normalValue: 'updated-value'
            };

            const existingSettings = {
                secretObj: { key1: 'secret1', key2: 'secret2' },
                normalValue: 'old-value'
            };

            const manifest = {
                secretObj: { type: 'object', secret: true },
                normalValue: { type: 'string' }
            };

            const result = prepareSettingsForSave(newSettings, existingSettings, manifest, false);

            expect(result.secretObj).toEqual({ key1: 'secret1', key2: 'secret2' });  // старые сохранены
            expect(result.normalValue).toBe('updated-value');  // новое сохранено
        });

        it('должен правильно обрабатывать частичное обновление настроек', () => {
            const newSettings = {
                apiKey: SECRET_MASK,  // не изменилось
                username: 'new_user',  // изменилось
                // serverUrl отсутствует в новых настройках
            };

            const existingSettings = {
                apiKey: 'secret-key',
                username: 'old_user',
                serverUrl: 'https://api.example.com'
            };

            const manifest = {
                apiKey: { type: 'string', secret: true },
                username: { type: 'string' },
                serverUrl: { type: 'string' }
            };

            const result = prepareSettingsForSave(newSettings, existingSettings, manifest, false);

            expect(result.apiKey).toBe('secret-key');  // старое сохранено
            expect(result.username).toBe('new_user');  // новое сохранено
            expect(result.serverUrl).toBeUndefined();  // отсутствует в новых настройках
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

