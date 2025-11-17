const express = require('express');
const router = express.Router();
const { getTraceCollector } = require('../../core/services/TraceCollectorService');

/**
 * GET /api/traces/:botId
 * Получить трассировки для бота
 */
router.get('/:botId', async (req, res) => {
  try {
    const botId = parseInt(req.params.botId);
    const { limit, status, graphId } = req.query;

    const options = {
      limit: limit ? parseInt(limit) : 150,
      status: status || null,
      graphId: graphId ? parseInt(graphId) : null,
    };

    const traceCollector = getTraceCollector();
    const traces = traceCollector.getTracesForBot(botId, options);

    res.json({
      success: true,
      traces,
    });
  } catch (error) {
    console.error('[API /traces/:botId] Ошибка:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/traces/:botId/:traceId
 * Получить конкретную трассировку по ID
 */
router.get('/:botId/:traceId', async (req, res) => {
  try {
    const { traceId } = req.params;

    const traceCollector = getTraceCollector();
    let trace = traceCollector.getTrace(traceId);

    // Если не нашли в памяти, пытаемся загрузить из БД
    if (!trace) {
      trace = await traceCollector.loadTraceFromDb(traceId);
    }

    if (!trace) {
      return res.status(404).json({
        success: false,
        error: 'Трассировка не найдена',
      });
    }

    res.json({
      success: true,
      trace,
    });
  } catch (error) {
    console.error('[API /traces/:botId/:traceId] Ошибка:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/traces/:botId/graph/:graphId/last
 * Получить последнюю трассировку для графа
 * Query params: eventType (опционально) - фильтр по типу события
 */
router.get('/:botId/graph/:graphId/last', async (req, res) => {
  try {
    const botId = parseInt(req.params.botId);
    const graphId = parseInt(req.params.graphId);
    const { eventType } = req.query;

    const traceCollector = getTraceCollector();
    const trace = await traceCollector.getLastTraceForGraph(botId, graphId, eventType);

    if (!trace) {
      return res.status(404).json({
        success: false,
        error: 'Трассировка не найдена',
      });
    }

    res.json({
      success: true,
      trace,
    });
  } catch (error) {
    console.error('[API /traces/:botId/graph/:graphId/last] Ошибка:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/traces/stats
 * Получить статистику трассировок
 */
router.get('/stats', async (req, res) => {
  try {
    const traceCollector = getTraceCollector();
    const stats = traceCollector.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[API /traces/stats] Ошибка:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
