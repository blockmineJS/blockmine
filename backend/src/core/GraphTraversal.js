function buildGraphIndices(graph) {
    if (!graph) return graph;
    if (graph.nodesById && graph.connectionsBySource && graph.connectionsByTarget) {
        return graph;
    }

    const nodesById = new Map();
    if (Array.isArray(graph.nodes)) {
        for (const node of graph.nodes) {
            if (node?.id) nodesById.set(node.id, node);
        }
    }

    const connectionsBySource = new Map();
    const connectionsByTarget = new Map();
    if (Array.isArray(graph.connections)) {
        for (const conn of graph.connections) {
            if (!conn) continue;
            if (conn.sourceNodeId) {
                if (!connectionsBySource.has(conn.sourceNodeId)) {
                    connectionsBySource.set(conn.sourceNodeId, []);
                }
                connectionsBySource.get(conn.sourceNodeId).push(conn);
            }
            if (conn.targetNodeId) {
                if (!connectionsByTarget.has(conn.targetNodeId)) {
                    connectionsByTarget.set(conn.targetNodeId, []);
                }
                connectionsByTarget.get(conn.targetNodeId).push(conn);
            }
        }
    }

    graph.nodesById = nodesById;
    graph.connectionsBySource = connectionsBySource;
    graph.connectionsByTarget = connectionsByTarget;
    return graph;
}

class GraphTraversal {
    constructor(activeGraph, memo) {
        this.activeGraph = activeGraph;
        this.memo = memo;
    }

    getNode(nodeId) {
        if (!this.activeGraph) return null;
        if (this.activeGraph.nodesById) {
            return this.activeGraph.nodesById.get(nodeId) || null;
        }
        return this.activeGraph.nodes?.find(n => n.id === nodeId) || null;
    }

    getOutgoing(nodeId) {
        if (!this.activeGraph) return [];
        if (this.activeGraph.connectionsBySource) {
            return this.activeGraph.connectionsBySource.get(nodeId) || [];
        }
        return this.activeGraph.connections?.filter(c => c.sourceNodeId === nodeId) || [];
    }

    getIncoming(nodeId) {
        if (!this.activeGraph) return [];
        if (this.activeGraph.connectionsByTarget) {
            return this.activeGraph.connectionsByTarget.get(nodeId) || [];
        }
        return this.activeGraph.connections?.filter(c => c.targetNodeId === nodeId) || [];
    }

    findConnection(nodeId, fromPinId) {
        const outgoing = this.getOutgoing(nodeId);
        for (const c of outgoing) {
            if (c.sourcePinId !== fromPinId) continue;
            if (this.getNode(c.targetNodeId)) return c;
        }
        return null;
    }

    findIncomingConnection(nodeId, toPinId) {
        const incoming = this.getIncoming(nodeId);
        for (const c of incoming) {
            if (c.targetPinId === toPinId) return c;
        }
        return null;
    }

    findNextNode(connection) {
        if (!connection) return null;
        return this.getNode(connection.targetNodeId);
    }

    hasConnection(nodeId, pinId) {
        return this.findIncomingConnection(nodeId, pinId) !== null;
    }

    collectLoopBodyNodes(loopNode) {
        const result = new Set();
        const queue = [];

        const initial = this.findConnection(loopNode.id, 'loop_body');
        if (initial) {
            const firstNode = this.getNode(initial.targetNodeId);
            if (firstNode) queue.push(firstNode);
        }

        const visited = new Set();
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current.id)) continue;
            visited.add(current.id);
            result.add(current.id);

            for (const conn of this.getOutgoing(current.id)) {
                const next = this.getNode(conn.targetNodeId);
                if (next) queue.push(next);
            }
        }

        return result;
    }

    clearLoopBodyMemo(loopNode) {
        if (!this.memo) return;
        const nodeIds = this.collectLoopBodyNodes(loopNode);
        for (const nodeId of nodeIds) {
            this.memo.delete(`${nodeId}_executed`);
            this.memo.delete(`trace_recorded:${nodeId}`);
            this.memo.delete(`trace_outputs_recorded:${nodeId}`);
            const prefix = `${nodeId}:`;
            for (const key of this.memo.keys()) {
                if (key.startsWith(prefix)) this.memo.delete(key);
            }
        }
    }
}

module.exports = GraphTraversal;
module.exports.buildGraphIndices = buildGraphIndices;
