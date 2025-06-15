const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const PluginService = require('../../core/PluginService');

const prisma = new PrismaClient();

router.get('/plugin-directories', async (req, res) => {
    try {
        const setting = await prisma.setting.findUnique({
            where: { key: 'plugin_directories' },
        });
        res.json(setting?.value || []);
    } catch (error) {
        res.status(500).json({ error: 'Не удалось получить настройки директорий' });
    }
});

router.post('/plugin-directories', async (req, res) => {
    try {
        const { directories } = req.body;
        if (!Array.isArray(directories)) {
            return res.status(400).json({ error: 'Ожидался массив директорий' });
        }

        const updatedSetting = await prisma.setting.upsert({
            where: { key: 'plugin_directories' },
            update: { value: directories },
            create: { key: 'plugin_directories', value: directories },
        });
        
        await PluginService.syncPluginsWithDb();

        res.json(updatedSetting);
    } catch (error) {
        res.status(500).json({ error: 'Не удалось сохранить настройки директорий' });
    }
});

module.exports = router;