const express = require('express');
const { param, body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authorize } = require('../middleware/auth');
const logger = require('../../lib/logger');

const prisma = new PrismaClient();
const router = express.Router({ mergeParams: true });

// Get all event graphs for a bot
router.get('/', 
  authorize('management:view'),
  async (req, res) => {
    const { botId } = req.params;
    const eventGraphs = await prisma.eventGraph.findMany({ 
      where: { botId: parseInt(botId) },
      include: { triggers: true }
    });
    res.json(eventGraphs);
  }
);

// Create a new event graph
router.post('/', 
  authorize('management:edit'),
  [body('name').isString().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { botId } = req.params;
    const { name } = req.body;

    const initialGraph = {
        nodes: [],
        connections: []
    };

    try {
        const newGraph = await prisma.eventGraph.create({
            data: {
                botId: parseInt(botId),
                name,
                graphJson: JSON.stringify(initialGraph)
            }
        });
        res.status(201).json(newGraph);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: `Event graph with name "${name}" already exists.` });
        }
        console.error("Failed to create event graph:", error);
        res.status(500).json({ error: 'Failed to create event graph' });
    }
  }
);

// Get a single event graph by ID
router.get('/:graphId', 
  authorize('management:view'),
  [param('graphId').isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { graphId } = req.params;
    const eventGraph = await prisma.eventGraph.findUnique({ 
      where: { id: parseInt(graphId) },
      include: { triggers: true } 
    });
    if (!eventGraph) {
      return res.status(404).json({ error: 'Event graph not found' });
    }
    res.json(eventGraph);
  }
);

// Update an event graph
router.put('/:graphId', 
  authorize('management:edit'),
  [
    param('graphId').isInt(),
    body('name').optional().isString().notEmpty(),
    body('isEnabled').optional().isBoolean(),
    body('graphJson').optional().isJSON(),
    body('variables').optional().isArray(),
    body('triggers').optional().isArray()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { graphId } = req.params;
    const { name, isEnabled, graphJson, variables, triggers } = req.body;

    try {
      const dataToUpdate = {};
      if (name !== undefined) dataToUpdate.name = name;
      if (isEnabled !== undefined) dataToUpdate.isEnabled = isEnabled;
      if (graphJson !== undefined) dataToUpdate.graphJson = graphJson;
      if (variables !== undefined) dataToUpdate.variables = JSON.stringify(variables);

      const updateGraphPromise = prisma.eventGraph.update({
        where: { id: parseInt(graphId) },
        data: dataToUpdate,
      });

      let transactionPromises = [updateGraphPromise];

      if (triggers) {
        const deleteTriggersPromise = prisma.eventTrigger.deleteMany({
          where: { graphId: parseInt(graphId) },
        });
        transactionPromises.push(deleteTriggersPromise);

        if (triggers.length > 0) {
            const createTriggersPromise = prisma.eventTrigger.createMany({
                data: triggers.map(eventType => ({
                    graphId: parseInt(graphId),
                    eventType,
                })),
            });
            transactionPromises.push(createTriggersPromise);
        }
      }
      
      const [updatedGraph] = await prisma.$transaction(transactionPromises);

      res.json(updatedGraph);
    } catch (error) {
        logger.error(error, "--- ERROR CAUGHT IN EVENT GRAPH UPDATE ---");
        res.status(500).json({ error: 'Failed to update event graph' });
    }
  }
);

// Delete an event graph
router.delete('/:graphId',
  authorize('management:edit'),
  [param('graphId').isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { graphId } = req.params;
    try {
      await prisma.eventGraph.delete({
        where: { id: parseInt(graphId) },
      });
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete event graph:', error);
      res.status(500).json({ error: 'Failed to delete event graph' });
    }
  }
);

// Export an event graph
router.get('/:graphId/export',
  authorize('management:view'),
  [param('graphId').isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { graphId } = req.params;
    try {
      const eventGraph = await prisma.eventGraph.findUnique({
        where: { id: parseInt(graphId) },
        include: { triggers: true },
      });

      if (!eventGraph) {
        return res.status(404).json({ error: 'Event graph not found' });
      }

      const exportData = {
        name: eventGraph.name,
        graphJson: eventGraph.graphJson,
        variables: eventGraph.variables,
        triggers: eventGraph.triggers.map(t => t.eventType),
      };

      res.json(exportData);
    } catch (error) {
      console.error('Failed to export event graph:', error);
      res.status(500).json({ error: 'Failed to export event graph' });
    }
  }
);

// Import an event graph
router.post('/import',
  authorize('management:edit'),
  [
    body('name').isString().notEmpty(),
    body('graphJson').isJSON(),
    body('variables').optional().isJSON(),
    body('triggers').optional().isArray(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { botId } = req.params;
    const { name, graphJson, variables, triggers } = req.body;

    try {
      const newGraph = await prisma.eventGraph.create({
        data: {
          botId: parseInt(botId),
          name: `${name} (копия)`,
          graphJson: graphJson,
          variables: variables || '[]',
          isEnabled: false, // Импортированный граф по умолчанию выключен
          triggers: {
            create: (triggers || []).map(eventType => ({ eventType })),
          },
        },
        include: { triggers: true }
      });
      res.status(201).json(newGraph);
    } catch (error) {
      if (error.code === 'P2002') {
          return res.status(409).json({ error: `Event graph with name "${name} (копия)" already exists.` });
      }
      console.error("Failed to import event graph:", error);
      res.status(500).json({ error: 'Failed to import event graph' });
    }
  }
);

module.exports = router;

