const { getTraceCollector } = require('../services/TraceCollectorService');

class GraphTraverser {
  constructor(activeGraph, traceCollector = null) {
    this.activeGraph = activeGraph;
    this.traceCollector = traceCollector || getTraceCollector();
    this.currentTraceId = null;
  }

  setTraceId(traceId) {
    this.currentTraceId = traceId;
  }

  async traverse(node, fromPinId) {
    const connection = this.findConnection(node.id, fromPinId);
    if (!connection) {
      return;
    }

    const nextNode = this.activeGraph.nodes.find(n => n.id === connection.targetNodeId);
    if (!nextNode) return;

    if (this.currentTraceId) {
      this.traceCollector.recordTraversal(
        this.currentTraceId,
        node.id,
        fromPinId,
        nextNode.id
      );
    }

    return nextNode;
  }

  findConnection(sourceNodeId, sourcePinId) {
    return this.activeGraph.connections.find(c => {
      if (c.sourceNodeId !== sourceNodeId || c.sourcePinId !== sourcePinId) return false;
      const targetExists = this.activeGraph.nodes.some(n => n.id === c.targetNodeId);
      return targetExists;
    });
  }

  getNextNode(connection) {
    return this.activeGraph.nodes.find(n => n.id === connection.targetNodeId);
  }

  clearLoopBodyMemo(memo, loopNode) {
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
      for (const key of memo.keys()) {
        if (key.startsWith(nodeId)) {
          memo.delete(key);
        }
      }
    }
  }

  hasConnection(node, pinId) {
    if (!this.activeGraph || !this.activeGraph.connections) return false;
    return this.activeGraph.connections.some(conn =>
      conn.targetNodeId === node.id && conn.targetPinId === pinId
    );
  }

  getOutgoingConnections(nodeId) {
    return this.activeGraph.connections.filter(c => c.sourceNodeId === nodeId);
  }

  getIncomingConnections(nodeId) {
    return this.activeGraph.connections.filter(c => c.targetNodeId === nodeId);
  }

  getConnection(sourceNodeId, sourcePinId, targetNodeId, targetPinId) {
    return this.activeGraph.connections.find(
      c => c.sourceNodeId === sourceNodeId &&
           c.sourcePinId === sourcePinId &&
           c.targetNodeId === targetNodeId &&
           c.targetPinId === targetPinId
    );
  }
}

module.exports = GraphTraverser;