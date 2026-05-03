const express = require('express');
const router = express.Router();
const nodeRegistry = require('../../core/NodeRegistry');

router.get('/nodes', (req, res) => {
  try {
    const graphType = req.query.graphType || null;
    const flat = nodeRegistry.getAllNodes().map(node => {
      const json = node.toJSON ? node.toJSON() : node;
      return json;
    });

    if (graphType) {
      const filtered = flat.filter(node =>
        node.graphType === graphType || node.graphType === 'ALL'
      );
      return res.json({ nodes: filtered, count: filtered.length });
    }

    res.json({ nodes: flat, count: flat.length });
  } catch (error) {
    console.error('[API] Error getting nodes:', error);
    res.status(500).json({ error: 'Failed to get nodes', message: error.message });
  }
});

router.get('/nodes/categories', (req, res) => {
  try {
    const graphType = req.query.graphType || null;
    const byCategory = nodeRegistry.getNodesByCategory(graphType);

    const result = {};
    for (const [category, nodes] of Object.entries(byCategory)) {
      result[category] = nodes.map(node => {
        return node.toJSON ? node.toJSON() : node;
      });
    }

    res.json({ categories: result, count: Object.keys(result).length });
  } catch (error) {
    console.error('[API] Error getting nodes by category:', error);
    res.status(500).json({ error: 'Failed to get nodes', message: error.message });
  }
});

router.get('/nodes/:type', (req, res) => {
  try {
    const { type } = req.params;
    const node = nodeRegistry.getNodeConfig(type);

    if (!node) {
      return res.status(404).json({ error: 'Node type not found', type });
    }

    const json = node.toJSON ? node.toJSON() : node;
    res.json({ node: json });
  } catch (error) {
    console.error('[API] Error getting node:', error);
    res.status(500).json({ error: 'Failed to get node', message: error.message });
  }
});

module.exports = router;