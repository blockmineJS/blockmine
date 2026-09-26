const { randomUUID } = require('crypto');
const { z } = require('zod');
const { ok, err, wrap, requirePermission, requireBotAccess } = require('../helpers');

const NODE_TYPES = z.string().min(1).max(80);
const VAR_NAME = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,63}$/);

function managerOrError() {
    try {
        return require('../../../core/services/GraphCollaborationManager').getGlobalCollaborationManager();
    } catch {
        return null;
    }
}

function summarizeRoom(room) {
    return {
        botId: room.botId,
        graphId: room.graphId,
        initialized: Boolean(room.graphState?.initialized),
        nodes: room.graphState?.nodes?.length || 0,
        edges: room.graphState?.edges?.length || 0,
        variables: (room.graphState?.variables || []).map((item) => item.name),
        users: Array.from(room.users.values()).map((user) => user.username),
    };
}

function resolveRoom(user, botId, graphId) {
    const manager = managerOrError();
    if (!manager) return { error: err('Редактор графов ещё не готов') };
    const mine = manager.roomsForUser(user.userId);
    if (botId == null && graphId == null) {
        if (mine.length === 0) {
            return { error: err('Открой граф в редакторе. Изменения попадают только в открытую сессию и сами не сохраняются.') };
        }
        if (mine.length > 1) {
            return { error: err('Открыто несколько графов. Укажи botId и graphId.', { graphs: mine.map(summarizeRoom) }) };
        }
        return { manager, room: mine[0] };
    }
    const room = manager.rooms.get(manager.getRoomKey(botId, graphId));
    const present = room && Array.from(room.users.values()).some((member) => member.userId === user.userId);
    if (!present) {
        return { error: err('Этого графа нет в твоей открытой сессии. Сначала открой его в редакторе.') };
    }
    return { manager, room };
}

function ensureReady(room) {
    if (!room.graphState?.initialized) {
        return err('Граф в сессии ещё не загрузился. Подожди, пока редактор откроется.');
    }
    return null;
}

function usernameOf(user, room) {
    const member = Array.from(room.users.values()).find((item) => item.userId === user.userId);
    return member?.username || user.username || 'mcp';
}

function presentGraph(room) {
    return {
        botId: room.botId,
        graphId: room.graphId,
        saved: false,
        nodes: room.graphState.nodes,
        edges: room.graphState.edges,
        variables: room.graphState.variables || [],
    };
}

function register(server, { user }) {
    server.registerTool('list_open_graphs', {
        description: 'List graphs currently open in this user\'s editor session. Graph MCP tools only change that live session. They do not save. The person in the editor saves.',
        inputSchema: {},
    }, wrap('list_open_graphs', async () => {
        const permErr = requirePermission(user, 'management:edit');
        if (permErr) return permErr;
        const manager = managerOrError();
        if (!manager) return err('Редактор графов ещё не готов');
        const graphs = manager.roomsForUser(user.userId).map(summarizeRoom);
        if (graphs.length === 0) {
            return err('Открой граф в редакторе. Изменения попадают только в открытую сессию и сами не сохраняются.');
        }
        return ok({ success: true, graphs });
    }));

    server.registerTool('get_open_graph', {
        description: 'Read nodes, connections, and variables from the graph open in the editor. Does not read the saved copy. Omit botId and graphId when only one graph is open.',
        inputSchema: {
            botId: z.number().int().optional(),
            graphId: z.number().int().optional(),
        },
    }, wrap('get_open_graph', async ({ botId, graphId } = {}) => {
        const permErr = requirePermission(user, 'management:edit');
        if (permErr) return permErr;
        if (botId != null) {
            const accessErr = await requireBotAccess(user, botId);
            if (accessErr) return accessErr;
        }
        const resolved = resolveRoom(user, botId, graphId);
        if (resolved.error) return resolved.error;
        const readyErr = ensureReady(resolved.room);
        if (readyErr) return readyErr;
        return ok({ success: true, graph: presentGraph(resolved.room) });
    }));

    server.registerTool('add_graph_node', {
        description: 'Add a node to the open editor graph. It shows up for the person in the session and is not saved until they save. type is a catalog id such as action:send_message or event:chat.',
        inputSchema: {
            botId: z.number().int().optional(),
            graphId: z.number().int().optional(),
            type: NODE_TYPES,
            id: z.string().min(1).max(80).optional(),
            position: z.object({ x: z.number(), y: z.number() }).optional(),
            data: z.record(z.string(), z.unknown()).optional(),
        },
    }, wrap('add_graph_node', async ({ botId, graphId, type, id, position, data }) => {
        const permErr = requirePermission(user, 'management:edit');
        if (permErr) return permErr;
        const resolved = resolveRoom(user, botId, graphId);
        if (resolved.error) return resolved.error;
        const readyErr = ensureReady(resolved.room);
        if (readyErr) return readyErr;
        const node = {
            id: id || `n_${randomUUID().slice(0, 8)}`,
            type,
            position: position || { x: 240, y: 180 },
            data: data && typeof data === 'object' ? data : {},
        };
        if (resolved.room.graphState.nodes.some((item) => item.id === node.id)) {
            return err(`Нода ${node.id} уже есть на холсте`);
        }
        const payload = { node };
        resolved.manager.applyNodeChange(resolved.room, 'create', payload);
        resolved.manager.pushToRoom(resolved.room, 'collab:node-changed', {
            type: 'create',
            data: payload,
            username: usernameOf(user, resolved.room),
        });
        return ok({ success: true, saved: false, node });
    }));

    server.registerTool('update_graph_node', {
        description: 'Merge fields into a node data object on the open graph. Does not save.',
        inputSchema: {
            botId: z.number().int().optional(),
            graphId: z.number().int().optional(),
            nodeId: z.string().min(1),
            data: z.record(z.string(), z.unknown()),
        },
    }, wrap('update_graph_node', async ({ botId, graphId, nodeId, data }) => {
        const permErr = requirePermission(user, 'management:edit');
        if (permErr) return permErr;
        const resolved = resolveRoom(user, botId, graphId);
        if (resolved.error) return resolved.error;
        const readyErr = ensureReady(resolved.room);
        if (readyErr) return readyErr;
        if (!resolved.room.graphState.nodes.some((item) => item.id === nodeId)) {
            return err(`Нода ${nodeId} не найдена в открытом графе`);
        }
        const payload = { nodeId, nodeData: data };
        resolved.manager.applyNodeChange(resolved.room, 'update', payload);
        resolved.manager.pushToRoom(resolved.room, 'collab:node-changed', {
            type: 'update',
            data: payload,
            username: usernameOf(user, resolved.room),
        });
        return ok({ success: true, saved: false, nodeId });
    }));

    server.registerTool('move_graph_nodes', {
        description: 'Move nodes on the open graph. Does not save.',
        inputSchema: {
            botId: z.number().int().optional(),
            graphId: z.number().int().optional(),
            moves: z.array(z.object({
                id: z.string(),
                position: z.object({ x: z.number(), y: z.number() }),
            })).min(1).max(100),
        },
    }, wrap('move_graph_nodes', async ({ botId, graphId, moves }) => {
        const permErr = requirePermission(user, 'management:edit');
        if (permErr) return permErr;
        const resolved = resolveRoom(user, botId, graphId);
        if (resolved.error) return resolved.error;
        const readyErr = ensureReady(resolved.room);
        if (readyErr) return readyErr;
        resolved.manager.applyNodeChange(resolved.room, 'move', moves);
        resolved.manager.pushToRoom(resolved.room, 'collab:node-changed', {
            type: 'move',
            data: moves,
            username: usernameOf(user, resolved.room),
        });
        return ok({ success: true, saved: false, moved: moves.length });
    }));

    server.registerTool('delete_graph_nodes', {
        description: 'Remove nodes from the open graph, together with their connections. Does not save. The start command node cannot be removed.',
        inputSchema: {
            botId: z.number().int().optional(),
            graphId: z.number().int().optional(),
            nodeIds: z.array(z.string()).min(1).max(100),
        },
    }, wrap('delete_graph_nodes', async ({ botId, graphId, nodeIds }) => {
        const permErr = requirePermission(user, 'management:edit');
        if (permErr) return permErr;
        const resolved = resolveRoom(user, botId, graphId);
        if (resolved.error) return resolved.error;
        const readyErr = ensureReady(resolved.room);
        if (readyErr) return readyErr;
        const protectedNode = resolved.room.graphState.nodes.find((node) => (
            nodeIds.includes(node.id) && (node.deletable === false || node.id === 'start')
        ));
        if (protectedNode) return err(`Ноду ${protectedNode.id} удалять нельзя`);
        const payload = { nodeIds };
        resolved.manager.applyNodeChange(resolved.room, 'delete', payload);
        resolved.manager.pushToRoom(resolved.room, 'collab:node-changed', {
            type: 'delete',
            data: payload,
            username: usernameOf(user, resolved.room),
        });
        return ok({ success: true, saved: false, deleted: nodeIds });
    }));

    server.registerTool('add_graph_connection', {
        description: 'Connect two pins on the open graph. sourceHandle and targetHandle are pin ids such as exec or message. Does not save.',
        inputSchema: {
            botId: z.number().int().optional(),
            graphId: z.number().int().optional(),
            source: z.string(),
            target: z.string(),
            sourceHandle: z.string(),
            targetHandle: z.string(),
            id: z.string().optional(),
        },
    }, wrap('add_graph_connection', async ({ botId, graphId, source, target, sourceHandle, targetHandle, id }) => {
        const permErr = requirePermission(user, 'management:edit');
        if (permErr) return permErr;
        const resolved = resolveRoom(user, botId, graphId);
        if (resolved.error) return resolved.error;
        const readyErr = ensureReady(resolved.room);
        if (readyErr) return readyErr;
        const nodes = resolved.room.graphState.nodes;
        if (!nodes.some((node) => node.id === source) || !nodes.some((node) => node.id === target)) {
            return err('Оба конца связи должны быть нодами открытого графа');
        }
        const edge = {
            id: id || `e_${randomUUID().slice(0, 8)}`,
            source,
            target,
            sourceHandle,
            targetHandle,
        };
        const payload = { edge };
        resolved.manager.applyEdgeChange(resolved.room, 'create', payload);
        resolved.manager.pushToRoom(resolved.room, 'collab:edge-changed', {
            type: 'create',
            data: payload,
            username: usernameOf(user, resolved.room),
        });
        return ok({ success: true, saved: false, edge });
    }));

    server.registerTool('delete_graph_connections', {
        description: 'Remove connections from the open graph by id. Does not save.',
        inputSchema: {
            botId: z.number().int().optional(),
            graphId: z.number().int().optional(),
            edgeIds: z.array(z.string()).min(1).max(100),
        },
    }, wrap('delete_graph_connections', async ({ botId, graphId, edgeIds }) => {
        const permErr = requirePermission(user, 'management:edit');
        if (permErr) return permErr;
        const resolved = resolveRoom(user, botId, graphId);
        if (resolved.error) return resolved.error;
        const readyErr = ensureReady(resolved.room);
        if (readyErr) return readyErr;
        const payload = { edgeIds };
        resolved.manager.applyEdgeChange(resolved.room, 'delete', payload);
        resolved.manager.pushToRoom(resolved.room, 'collab:edge-changed', {
            type: 'delete',
            data: payload,
            username: usernameOf(user, resolved.room),
        });
        return ok({ success: true, saved: false, deleted: edgeIds });
    }));

    server.registerTool('set_graph_variable', {
        description: 'Create or update a graph variable in the open editor session. Does not save. type is string, number, boolean, or array.',
        inputSchema: {
            botId: z.number().int().optional(),
            graphId: z.number().int().optional(),
            name: VAR_NAME,
            type: z.enum(['string', 'number', 'boolean', 'array']).optional(),
            value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
        },
    }, wrap('set_graph_variable', async ({ botId, graphId, name, type = 'string', value = '' }) => {
        const permErr = requirePermission(user, 'management:edit');
        if (permErr) return permErr;
        const resolved = resolveRoom(user, botId, graphId);
        if (resolved.error) return resolved.error;
        const readyErr = ensureReady(resolved.room);
        if (readyErr) return readyErr;
        const existing = (resolved.room.graphState.variables || []).find((item) => item.name === name);
        const variable = {
            id: existing?.id || randomUUID(),
            name,
            type: type || existing?.type || 'string',
            value: value === null ? '' : value,
        };
        const payload = { variable };
        resolved.manager.applyVariableChange(resolved.room, 'set', payload);
        resolved.manager.pushToRoom(resolved.room, 'collab:variables-changed', {
            type: 'set',
            data: payload,
            username: usernameOf(user, resolved.room),
        });
        return ok({ success: true, saved: false, variable });
    }));

    server.registerTool('delete_graph_variable', {
        description: 'Remove a graph variable by name from the open editor session. Does not save.',
        inputSchema: {
            botId: z.number().int().optional(),
            graphId: z.number().int().optional(),
            name: VAR_NAME,
        },
    }, wrap('delete_graph_variable', async ({ botId, graphId, name }) => {
        const permErr = requirePermission(user, 'management:edit');
        if (permErr) return permErr;
        const resolved = resolveRoom(user, botId, graphId);
        if (resolved.error) return resolved.error;
        const readyErr = ensureReady(resolved.room);
        if (readyErr) return readyErr;
        const payload = { name };
        resolved.manager.applyVariableChange(resolved.room, 'delete', payload);
        resolved.manager.pushToRoom(resolved.room, 'collab:variables-changed', {
            type: 'delete',
            data: payload,
            username: usernameOf(user, resolved.room),
        });
        return ok({ success: true, saved: false, name });
    }));
}

module.exports = register;
