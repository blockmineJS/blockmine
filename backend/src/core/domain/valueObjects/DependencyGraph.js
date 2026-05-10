class DependencyGraph {
    constructor() {
        this._nodes = new Map();
        this._edges = new Map();
    }

    addNode(name, version) {
        this._nodes.set(name, version);
        if (!this._edges.has(name)) {
            this._edges.set(name, []);
        }
    }

    addEdge(from, to, versionRange) {
        if (!this._edges.has(from)) {
            this._edges.set(from, []);
        }
        this._edges.get(from).push({ to, versionRange });
    }

    getNodes() {
        return new Map(this._nodes);
    }

    getDependencies(name) {
        return this._edges.get(name) || [];
    }

    hasNode(name) {
        return this._nodes.has(name);
    }

    getVersion(name) {
        return this._nodes.get(name) || null;
    }

    detectCycles() {
        const visited = new Set();
        const visiting = new Set();
        const cycles = [];

        const visit = (name, path) => {
            if (visiting.has(name)) {
                const cycleStart = path.indexOf(name);
                cycles.push(path.slice(cycleStart).concat(name));
                return;
            }
            if (visited.has(name)) return;

            visiting.add(name);
            for (const { to } of this.getDependencies(name)) {
                visit(to, [...path, name]);
            }
            visiting.delete(name);
            visited.add(name);
        };

        for (const name of this._nodes.keys()) {
            visit(name, []);
        }

        return cycles;
    }

    topologicalSort() {
        const visited = new Set();
        const result = [];

        const visit = (name) => {
            if (visited.has(name)) return;
            visited.add(name);
            for (const { to } of this.getDependencies(name)) {
                if (this._nodes.has(to)) visit(to);
            }
            result.push(name);
        };

        for (const name of this._nodes.keys()) {
            visit(name);
        }

        return result;
    }
}

module.exports = DependencyGraph;
