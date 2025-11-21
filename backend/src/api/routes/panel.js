const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { authenticate, authenticateUniversal, authorize } = require('../middleware/auth');
const config = require('../../config');

const router = express.Router();

const DATA_DIR = path.join(os.homedir(), '.blockmine');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

/**
 * @route   GET /api/panel/settings
 * @desc    Получить текущие глобальные настройки
 * @access  Private (Admin only)
 */
router.get('/settings', authenticateUniversal, authorize('panel:settings:view'), (req, res) => {
    const { server, telemetry } = config;
    res.json({
        server: {
            allowExternalAccess: server.allowExternalAccess
        },
        telemetry: {
            enabled: telemetry?.enabled ?? true
        }
    });
});

/**
 * @route   PUT /api/panel/settings
 * @desc    Обновить глобальные настройки
 * @access  Private (Admin only)
 */
router.put('/settings', authenticateUniversal, authorize('panel:settings:edit'), async (req, res) => {
    const { allowExternalAccess, telemetryEnabled } = req.body;
    
    try {
        const currentConfig = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf-8'));

        if (typeof allowExternalAccess === 'boolean') {
            currentConfig.server.allowExternalAccess = allowExternalAccess;
            currentConfig.server.host = allowExternalAccess ? '0.0.0.0' : '127.0.0.1';
            console.log(`[Config Update] Внешний доступ ${allowExternalAccess ? 'ВКЛЮЧЕН' : 'ВЫКЛЮЧЕН'}. Хост изменен на ${currentConfig.server.host}`);
        }
        
        if (typeof telemetryEnabled === 'boolean') {
            if (!currentConfig.telemetry) {
                currentConfig.telemetry = {};
            }
            currentConfig.telemetry.enabled = telemetryEnabled;
        }

        await fs.writeFile(CONFIG_PATH, JSON.stringify(currentConfig, null, 2), 'utf-8');

        res.json({ 
            message: 'Настройки сохранены. Для применения требуется перезапуск панели.',
            requiresRestart: true 
        });

    } catch (error) {
        console.error("Ошибка обновления файла конфигурации:", error);
        res.status(500).json({ error: 'Не удалось сохранить настройки.' });
    }
});

module.exports = router;