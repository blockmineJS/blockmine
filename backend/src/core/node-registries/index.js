const path = require('path');
const fs = require('fs');

const { NodeDefinition } = require('../../core/NodeDefinition');
const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

function registerAllNodes(registry) {
  const registriesDir = path.join(__dirname);

  try {
    const files = fs.readdirSync(registriesDir)
      .filter(file => file.endsWith('.js') && file !== 'index.js' && file !== 'registerAllNodes.js');

    for (const file of files) {
      try {
        const modulePath = path.join(registriesDir, file);
        const registryModule = require(modulePath);

        if (typeof registryModule.registerNodes === 'function') {
          registryModule.registerNodes(registry);
        } else if (Array.isArray(registryModule)) {
          for (const def of registryModule) {
            registry.registerNodeType(def);
          }
        }
      } catch (error) {
        console.error(`[Node Registries] Error loading ${file}:`, error.message);
      }
    }
  } catch (error) {
    console.error('[Node Registries] Error reading directory:', error.message);
  }
}

function createNodeDefinitions() {
  const nodes = {};
  const registriesDir = __dirname;

  try {
    const files = fs.readdirSync(registriesDir)
      .filter(file => file.endsWith('.js') && file !== 'index.js' && file !== 'registerAllNodes.js');

    for (const file of files) {
      try {
        const modulePath = path.join(registriesDir, file);
        const registryModule = require(modulePath);

        if (Array.isArray(registryModule)) {
          for (const def of registryModule) {
            if (def instanceof NodeDefinition || (def.type && def.label)) {
              nodes[def.type] = def instanceof NodeDefinition ? def.toJSON() : def;
            }
          }
        }
      } catch (error) {
        console.error(`[Node Registries] Error creating definitions from ${file}:`, error.message);
      }
    }
  } catch (error) {
    console.error('[Node Registries] Error reading directory:', error.message);
  }

  return nodes;
}

function getNodesByCategory(grouped = true) {
  const allNodes = createNodeDefinitions();
  const byCategory = {};

  for (const [type, node] of Object.entries(allNodes)) {
    const category = node.category || 'Other';

    if (!byCategory[category]) {
      byCategory[category] = [];
    }

    byCategory[category].push({
      ...node,
      type
    });
  }

  if (grouped) {
    return byCategory;
  }

  return Object.values(byCategory).flat();
}

function getNodeDefinition(type) {
  const allNodes = createNodeDefinitions();
  return allNodes[type] || null;
}

function getAllNodeTypes() {
  const allNodes = createNodeDefinitions();
  return Object.keys(allNodes);
}

module.exports = {
  registerAllNodes,
  createNodeDefinitions,
  getNodesByCategory,
  getNodeDefinition,
  getAllNodeTypes,
  NodeDefinition,
  GRAPH_TYPES
};