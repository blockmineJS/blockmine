const express = require('express');
const TtlCache = require('../../core/utils/ttlCache');

const router = express.Router();

const STATS_SERVER_URL = process.env.STATS_SERVER_URL || 'http://185.65.200.184:3000';
const STATS_CACHE_TTL_MS = 60 * 1000;
const STATS_REQUEST_TIMEOUT_MS = 5000;
const STATS_CACHE_KEY = 'stats';

const statsCache = new TtlCache({ ttlMs: STATS_CACHE_TTL_MS, cleanupIntervalMs: 5 * 60 * 1000, maxSize: 4 });

async function fetchStats() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), STATS_REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(`${STATS_SERVER_URL}/api/stats`, { signal: controller.signal });
        if (!response.ok) {
            const error = new Error(`Stats server returned ${response.status}`);
            error.status = response.status;
            throw error;
        }
        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

router.get('/', async (req, res) => {
    const cached = statsCache.get(STATS_CACHE_KEY);
    if (cached) {
        return res.json(cached);
    }

    try {
        const stats = await fetchStats();
        statsCache.set(STATS_CACHE_KEY, stats);
        res.json(stats);
    } catch (error) {
        console.warn(`[stats proxy] Не удалось получить статистику: ${error.message}`);
        res.json({
            online_bots_count: 0,
            total_unique_bots_ever: 0,
            plugins: [],
            online_bots_list: [],
        });
    }
});

module.exports = router;
