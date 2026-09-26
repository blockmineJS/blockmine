const { GraphCollaborationManager } = require('../GraphCollaborationManager');

function session() {
    const events = [];
    const manager = new GraphCollaborationManager();
    manager.initialize({
        to() {
            return {
                emit(event, data) {
                    events.push({ event, data });
                },
            };
        },
    });
    const socket = {
        id: 'socket-1',
        join() {},
        emit() {},
        to() { return { emit() {} }; },
    };
    manager.joinGraph(socket, { botId: 3, graphId: 9, username: 'root', userId: 1 });
    manager.initializeGraphState(socket, {
        botId: 3,
        graphId: 9,
        nodes: [{ id: 'start', type: 'event:command', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
        variables: [],
    });
    return { manager, events };
}

describe('open graph session', () => {
    it('changes the room the user is in and tells that session', () => {
        const { manager, events } = session();
        const room = manager.roomsForUser(1)[0];
        const node = { id: 'msg', type: 'action:send_message', position: { x: 10, y: 20 }, data: {} };

        manager.applyNodeChange(room, 'create', { node });
        manager.pushToRoom(room, 'collab:node-changed', { type: 'create', data: { node }, username: 'root' });
        manager.applyVariableChange(room, 'set', { variable: { id: 'v1', name: 'secret', type: 'number', value: 7 } });

        expect(room.graphState.nodes.map((item) => item.id)).toEqual(['start', 'msg']);
        expect(room.graphState.variables[0].name).toBe('secret');
        expect(events[0].event).toBe('collab:node-changed');
        expect(manager.roomsForUser(99)).toEqual([]);
    });

    it('does not expose a room before the editor has loaded the graph', () => {
        const manager = new GraphCollaborationManager();
        manager.initialize({ to() { return { emit() {} }; } });
        const socket = { id: 'socket-2', join() {}, emit() {}, to() { return { emit() {} }; } };
        manager.joinGraph(socket, { botId: 1, graphId: 2, username: 'root', userId: 1 });
        expect(manager.roomsForUser(1)[0].graphState.initialized).toBe(false);
    });
});
