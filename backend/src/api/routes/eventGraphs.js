const express = require('express');
const { param, body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authorize } = require('../middleware/auth');
const logger = require('../../lib/logger');
const crypto = require('crypto');

const prisma = new PrismaClient();
const router = express.Router({ mergeParams: true });

router.get('/', 
  authorize('management:view'),
  async (req, res) => {
    const { botId } = req.params;
    const eventGraphs = await prisma.eventGraph.findMany({ 
      where: { botId: parseInt(botId) },
      include: { triggers: true },
      orderBy: { createdAt: 'desc' }
    });

    const graphsWithCounts = eventGraphs.map(graph => {
      let nodeCount = 0;
      let edgeCount = 0;
      if (graph.graphJson) {
        try {
          const parsedGraph = JSON.parse(graph.graphJson);
          nodeCount = parsedGraph.nodes?.length || 0;
          edgeCount = parsedGraph.connections?.length || 0;
        } catch (e) {
        }
      }
      return { ...graph, nodeCount, edgeCount };
    });

    res.json(graphsWithCounts);
  }
);

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

      if (variables !== undefined) {
          dataToUpdate.variables = Array.isArray(variables) ? JSON.stringify(variables) : variables;
      }
      
      if (triggers !== undefined) {
        dataToUpdate.triggers = {
          deleteMany: {},
          create: triggers.map(eventType => ({
            eventType,
          })),
        };
      }

      const updatedGraph = await prisma.eventGraph.update({
        where: { id: parseInt(graphId) },
        data: dataToUpdate,
        include: { triggers: true },
      });

      res.json(updatedGraph);
    } catch (error) {
        logger.error(error, "--- ERROR CAUGHT IN EVENT GRAPH UPDATE ---");
        res.status(500).json({ error: 'Failed to update event graph' });
    }
  }
);

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
      const graph = JSON.parse(graphJson);
      const idMap = new Map();

      if (graph.nodes && Array.isArray(graph.nodes)) {
        graph.nodes.forEach(node => {
          if (node && node.id) {
            const oldId = node.id;
            const newId = `node_${crypto.randomUUID()}`;
            idMap.set(oldId, newId);
            node.id = newId;
          }
        });
      }

      const connectionList = graph.edges || graph.connections;
      const updatedConnections = [];
      if (connectionList && Array.isArray(connectionList)) {
        connectionList.forEach(conn => {
          if (conn && (conn.source || conn.sourceNodeId) && (conn.target || conn.targetNodeId)) {
            const oldSourceId = conn.source || conn.sourceNodeId;
            const oldTargetId = conn.target || conn.targetNodeId;

            const newSourceId = idMap.get(oldSourceId);
            const newTargetId = idMap.get(oldTargetId);

            if (newSourceId && newTargetId) {
              conn.id = `edge_${crypto.randomUUID()}`;
              conn.sourceNodeId = newSourceId;
              conn.targetNodeId = newTargetId;
              
              delete conn.source;
              delete conn.target;
              
              updatedConnections.push(conn);
            }
          }
        });

        graph.connections = updatedConnections;
        delete graph.edges;
      }

      const newGraphJson = JSON.stringify(graph);

      const newGraph = await prisma.eventGraph.create({
        data: {
          botId: parseInt(botId),
          name: `${name} (копия)`,
          graphJson: newGraphJson,
          variables: variables || '[]',
          isEnabled: false,
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

router.post('/:graphId/duplicate',
  authorize('management:edit'),
  [param('graphId').isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { botId, graphId } = req.params;

    try {
      const originalGraph = await prisma.eventGraph.findUnique({
        where: { id: parseInt(graphId) },
        include: { triggers: true },
      });

      if (!originalGraph) {
        return res.status(404).json({ error: 'Original event graph not found' });
      }

      const graph = JSON.parse(originalGraph.graphJson);
      const idMap = new Map();
      
      if (graph.nodes && Array.isArray(graph.nodes)) {
          graph.nodes.forEach(node => {
              if (node && node.id) {
                  const oldId = node.id;
                  const newId = `node_${crypto.randomUUID()}`;
                  idMap.set(oldId, newId);
                  node.id = newId;
              }
          });
      }

      const connectionList = graph.connections || [];
      const updatedConnections = [];
      if (Array.isArray(connectionList)) {
          connectionList.forEach(conn => {
              if (conn && conn.sourceNodeId && conn.targetNodeId) {
                  const newSourceId = idMap.get(conn.sourceNodeId);
                  const newTargetId = idMap.get(conn.targetNodeId);

                  if (newSourceId && newTargetId) {
                      updatedConnections.push({
                          ...conn,
                          id: `edge_${crypto.randomUUID()}`,
                          sourceNodeId: newSourceId,
                          targetNodeId: newTargetId,
                      });
                  }
              }
          });
      }
      graph.connections = updatedConnections;

      const newGraphJson = JSON.stringify(graph);
      const newName = `${originalGraph.name} (копия)`;

      const newGraph = await prisma.eventGraph.create({
        data: {
          botId: parseInt(botId),
          name: newName,
          graphJson: newGraphJson,
          variables: originalGraph.variables,
          isEnabled: false,
          triggers: {
            create: originalGraph.triggers.map(t => ({ eventType: t.eventType })),
          },
        },
      });

      res.status(201).json(newGraph);
    } catch (error) {
      logger.error('Failed to duplicate event graph:', error);
      res.status(500).json({ error: 'Failed to duplicate event graph' });
    }
  }
);

module.exports = router;

