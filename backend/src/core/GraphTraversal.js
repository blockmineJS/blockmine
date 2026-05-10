class GraphTraversal {
    constructor(activeGraph, memo) {
        this.activeGraph = activeGraph;
        this.memo = memo;
    }

    findConnection(nodeId, fromPinId) {
        if (!this.activeGraph || !this.activeGraph.connections) return null;

        return this.activeGraph.connections.find(c => {
            if (c.sourceNodeId !== nodeId || c.sourcePinId !== fromPinId) return false;
            const targetExists = this.activeGraph.nodes.some(n => n.id === c.targetNodeId);
            return targetExists;
        });
    }

    findNextNode(connection) {
        if (!connection || !this.activeGraph) return null;
        return this.activeGraph.nodes.find(n => n.id === connection.targetNodeId) || null;
    }

    clearLoopBodyMemo(loopNode) {
        const nodesToClear = new Set();
        const queue = [];

        const initialConnection = this.activeGraph.connections.find(
            c => c.sourceNodeId === loopNode.id && c.sourcePinId === 'loop_body'
        );
        if (initialConnection) {
            const firstNode = this.activeGraph.nodes.find(n => n.id === initialConnection.targetNodeId);
            if (firstNode) {
                queue.push(firstNode);
            }
        }

        const visited = new Set();
        while (queue.length > 0) {
            const currentNode = queue.shift();
            if (visited.has(currentNode.id)) continue;
            visited.add(currentNode.id);

            nodesToClear.add(currentNode.id);

            const connections = this.activeGraph.connections.filter(c => c.sourceNodeId === currentNode.id);
            for (const conn of connections) {
                const nextNode = this.activeGraph.nodes.find(n => n.id === conn.targetNodeId);
                if (nextNode) {
                    queue.push(nextNode);
                }
            }
        }

        for (const nodeId of nodesToClear) {
            for (const key of this.memo.keys()) {
                if (key.startsWith(nodeId)) {
                    this.memo.delete(key);
                }
            }
        }
    }

    getConnectionsFromNode(nodeId) {
        if (!this.activeGraph || !this.activeGraph.connections) return [];
        return this.activeGraph.connections.filter(c => c.sourceNodeId === nodeId);
    }

    getConnectionsToNode(nodeId) {
        if (!this.activeGraph || !this.activeGraph.connections) return [];
        return this.activeGraph.connections.filter(c => c.targetNodeId === nodeId);
    }

    hasConnection(nodeId, pinId) {
        if (!this.activeGraph || !this.activeGraph.connections) return false;
        return this.activeGraph.connections.some(conn =>
            conn.targetNodeId === nodeId && conn.targetPinId === pinId
        );
    }
}

module.exports = GraphTraversal;