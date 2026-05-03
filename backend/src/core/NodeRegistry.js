const validationService = require('./services/ValidationService');
const { GRAPH_TYPES } = require('./constants/graphTypes');
const { NodeDefinition } = require('./NodeDefinition');

class NodeRegistry {
  constructor() {
    this.nodes = new Map();
    this._registerBaseNodes();
  }

  registerNodeType(config) {
    if (!config.type) {
      throw new Error('Node type is required');
    }

    const validation = validationService.validateNode(config, 'NodeRegistry');
    if (validation.shouldSkip) {
      return;
    }

    if (this.nodes.has(config.type)) {
      console.warn(`Node type '${config.type}' is already registered. Overriding.`);
    }

    let nodeDef;

    if (config instanceof NodeDefinition) {
      nodeDef = config;
    } else {
      nodeDef = this._normalizeToNodeDefinition(config);
    }

    this.nodes.set(config.type, nodeDef);
  }

  _normalizeToNodeDefinition(config) {
    const inputs = config.computeInputs
      ? config.computeInputs
      : (() => config.pins?.inputs || []);

    const outputs = config.computeOutputs
      ? config.computeOutputs
      : (() => config.pins?.outputs || []);

    return new NodeDefinition({
      type: config.type,
      category: config.category || 'Other',
      label: config.label || config.type,
      description: config.description || '',
      computeInputs: inputs,
      computeOutputs: outputs,
      pins: config.pins || { inputs: [], outputs: [] },
      executor: config.executor || null,
      evaluator: config.evaluator || null,
      defaultData: config.defaultData || {},
      theme: config.theme || {},
      icon: config.icon || null,
      graphType: config.graphType || GRAPH_TYPES.ALL
    });
  }

  getNodeConfig(nodeType) {
    return this.nodes.get(nodeType);
  }

  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  getNodesByCategory(graphType) {
    const result = {};
    for (const node of this.nodes.values()) {
      if (node.graphType === GRAPH_TYPES.ALL || node.graphType === graphType) {
        if (!result[node.category]) {
          result[node.category] = [];
        }
        result[node.category].push(node);
      }
    }
    return result;
  }

  hasNodeType(nodeType) {
    return this.nodes.has(nodeType);
  }

  getNodesByTypes(types) {
    return types.map(type => this.nodes.get(type)).filter(Boolean);
  }

  _registerBaseNodes() {
    const fs = require('fs');
    const path = require('path');

    const registriesDir = path.join(__dirname, 'node-registries');

    try {
      const files = fs.readdirSync(registriesDir)
        .filter(file => file.endsWith('.js'));

      for (const file of files) {
        try {
          const registry = require(path.join(registriesDir, file));

          if (typeof registry.registerNodes === 'function') {
            registry.registerNodes(this);
          } else if (Array.isArray(registry)) {
            for (const def of registry) {
              this.registerNodeType(def);
            }
          } else if (typeof registry.registerNodeDefinitions === 'function') {
            const definitions = registry.registerNodeDefinitions();
            for (const def of definitions) {
              this.registerNodeType(def);
            }
          } else if (typeof registry.createNodeDefinitions === 'function' ||
                     typeof registry.getNodesByCategory === 'function' ||
                     typeof registry.getAllNodeTypes === 'function') {
            // Это служебный модуль (index.js), не содержит нод напрямую
            // Пропускаем без варнинга
          } else {
            console.warn(`NodeRegistry: Файл ${file} не экспортирует registerNodes, массив нод или registerNodeDefinitions`);
          }
        } catch (error) {
          console.error(`NodeRegistry: Ошибка загрузки реестра из ${file}:`, error.message);
        }
      }

      console.log(`NodeRegistry: Registered ${this.nodes.size} base nodes from ${files.length} registries`);
    } catch (error) {
      console.error('NodeRegistry: Ошибка чтения директории node-registries:', error.message);
    }
  }

  toJSON() {
    const result = {};
    for (const [type, nodeDef] of this.nodes) {
      result[type] = nodeDef.toJSON();
    }
    return result;
  }

  getNodesByCategoryFlat() {
    const flat = [];
    for (const node of this.nodes.values()) {
      flat.push(node.toJSON());
    }
    return flat;
  }
}

const nodeRegistryInstance = new NodeRegistry();
module.exports = nodeRegistryInstance;