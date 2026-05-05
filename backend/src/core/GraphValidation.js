const validationService = require('./services/ValidationService');

class GraphValidation {
    static validateGraphForExecution(graph, source) {
        if (!graph || graph === 'null') {
            return { shouldSkip: true, error: null };
        }

        const parsedGraph = validationService.parseGraph(graph, source);
        if (!parsedGraph) {
            return { shouldSkip: true, error: 'Invalid graph' };
        }

        const validation = validationService.validateGraphStructure(parsedGraph, source);
        if (validation.shouldSkip) {
            return { shouldSkip: true, error: validation.reason };
        }

        return { shouldSkip: false, graph: parsedGraph };
    }

    static findStartNode(graph, eventType) {
        if (!graph || !graph.nodes) return null;

        const eventName = eventType || 'command';
        return graph.nodes.find(n => n.type === `event:${eventName}`) || null;
    }

    static getNodeInputPins(nodeConfig, nodeData) {
        if (!nodeConfig) return [];

        let inputPins = [];
        try {
            if (typeof nodeConfig.getInputs === 'function') {
                inputPins = nodeConfig.getInputs(nodeData || {}) || [];
            } else if (typeof nodeConfig.computeInputs === 'function') {
                inputPins = nodeConfig.computeInputs(nodeData || {}) || [];
            } else if (nodeConfig.pins && Array.isArray(nodeConfig.pins.inputs)) {
                inputPins = nodeConfig.pins.inputs;
            }
        } catch (e) {
            inputPins = nodeConfig.pins?.inputs || [];
        }

        return inputPins;
    }

    static getNodeOutputPins(nodeConfig, nodeData) {
        if (!nodeConfig) return [];

        let outputPins = [];
        try {
            if (typeof nodeConfig.getOutputs === 'function') {
                outputPins = nodeConfig.getOutputs(nodeData || {}) || [];
            } else if (typeof nodeConfig.computeOutputs === 'function') {
                outputPins = nodeConfig.computeOutputs(nodeData || {}) || [];
            } else if (nodeConfig.pins && Array.isArray(nodeConfig.pins.outputs)) {
                outputPins = nodeConfig.pins.outputs;
            }
        } catch (e) {
            outputPins = nodeConfig.pins?.outputs || [];
        }

        return outputPins;
    }

    static isDataNode(nodeConfig) {
        const inputPins = GraphValidation.getNodeInputPins(nodeConfig, {});
        return !inputPins.some(p => p && p.type === 'Exec');
    }
}

module.exports = GraphValidation;