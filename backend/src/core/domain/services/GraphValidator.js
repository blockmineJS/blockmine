const MALICIOUS_PATTERNS = [
    /require\s*\(/,
    /process\s*\./,
    /eval\s*\(/,
    /Function\s*\(/,
    /__proto__/,
    /constructor\s*\[/,
];

class GraphValidator {
    validate(graph) {
        const errors = [];

        if (!graph || typeof graph !== 'object') {
            return { valid: false, errors: ['graph.errors.invalidType'] };
        }

        if (!Array.isArray(graph.nodes)) {
            errors.push('graph.errors.missingNodes');
        }

        if (!Array.isArray(graph.connections)) {
            errors.push('graph.errors.missingConnections');
        }

        if (errors.length > 0) {
            return { valid: false, errors };
        }

        const nodeIds = new Set();
        for (const node of graph.nodes) {
            if (!node.id || typeof node.id !== 'string') {
                errors.push('graph.errors.nodeInvalidId');
                continue;
            }
            if (nodeIds.has(node.id)) {
                errors.push('graph.errors.nodeDuplicateId');
            }
            nodeIds.add(node.id);

            if (!node.type || typeof node.type !== 'string') {
                errors.push('graph.errors.nodeInvalidType');
            }

            if (this._hasMaliciousContent(node)) {
                errors.push('graph.errors.nodeMaliciousContent');
            }
        }

        for (const conn of graph.connections) {
            if (!conn.sourceNodeId || !conn.targetNodeId) {
                errors.push('graph.errors.connectionInvalidNodes');
                continue;
            }
            if (!nodeIds.has(conn.sourceNodeId)) {
                errors.push('graph.errors.connectionSourceNotFound');
            }
            if (!nodeIds.has(conn.targetNodeId)) {
                errors.push('graph.errors.connectionTargetNotFound');
            }
        }

        const cycles = this._detectCycles(graph);
        if (cycles.length > 0) {
            errors.push('graph.errors.cycleDetected');
        }

        return { valid: errors.length === 0, errors };
    }

    _hasMaliciousContent(node) {
        const str = JSON.stringify(node.data || {});
        return MALICIOUS_PATTERNS.some(p => p.test(str));
    }

    _detectCycles(graph) {
        const execConnections = graph.connections.filter(c => {
            return true;
        });

        const adj = new Map();
        for (const node of graph.nodes) {
            adj.set(node.id, []);
        }
        for (const conn of execConnections) {
            if (adj.has(conn.sourceNodeId)) {
                adj.get(conn.sourceNodeId).push(conn.targetNodeId);
            }
        }

        const visited = new Set();
        const visiting = new Set();
        const cycles = [];

        const visit = (id) => {
            if (visiting.has(id)) {
                cycles.push(id);
                return;
            }
            if (visited.has(id)) return;
            visiting.add(id);
            for (const next of (adj.get(id) || [])) {
                visit(next);
            }
            visiting.delete(id);
            visited.add(id);
        };

        for (const node of graph.nodes) {
            visit(node.id);
        }

        return cycles;
    }
}

module.exports = GraphValidator;
