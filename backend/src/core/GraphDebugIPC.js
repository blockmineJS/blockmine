const debugConfig = require('../config/debug.config');

const pendingDebugRequests = new Map();

function handleDebugResponse(message) {
    const { requestId, overrides } = message;
    const resolve = pendingDebugRequests.get(requestId);

    if (resolve) {
        const timeoutId = pendingDebugRequests.get(`${requestId}_timeout`);
        if (timeoutId) {
            clearTimeout(timeoutId);
            pendingDebugRequests.delete(`${requestId}_timeout`);
        }

        pendingDebugRequests.delete(requestId);
        resolve(overrides);
    }
}

function attachDebugIpcHandler() {
    if (process.on && !attachDebugIpcHandler._attached) {
        process.on('message', (message) => {
            if (message.type === 'debug:breakpoint_response' || message.type === 'debug:step_response') {
                handleDebugResponse(message);
            }
        });
        attachDebugIpcHandler._attached = true;
    }
}

async function checkBreakpointViaIpc(node, context, captureNodeInputs, currentTraceId, traceCollector) {
    const { randomUUID } = require('crypto');
    const requestId = randomUUID();

    const inputs = await captureNodeInputs(node);
    const executedSteps = currentTraceId
        ? await traceCollector.getTrace(currentTraceId)
        : null;

    process.send({
        type: 'debug:check_breakpoint',
        requestId,
        payload: {
            graphId: context.graphId,
            nodeId: node.id,
            nodeType: node.type,
            inputs,
            executedSteps,
            context: {
                user: context.user,
                variables: context.variables,
                commandArguments: context.commandArguments,
            }
        }
    });

    return new Promise((resolve) => {
        pendingDebugRequests.set(requestId, resolve);

        const timeoutId = setTimeout(() => {
            if (pendingDebugRequests.has(requestId)) {
                pendingDebugRequests.delete(requestId);
                resolve(null);
            }
        }, debugConfig.BREAKPOINT_TIMEOUT);

        pendingDebugRequests.set(`${requestId}_timeout`, timeoutId);
    });
}

async function checkStepModeViaIpc(node, context, captureNodeInputs, currentTraceId, traceCollector) {
    const { randomUUID } = require('crypto');
    const requestId = randomUUID();

    const inputs = await captureNodeInputs(node);
    const executedSteps = currentTraceId
        ? await traceCollector.getTrace(currentTraceId)
        : null;

    process.send({
        type: 'debug:check_step_mode',
        requestId,
        payload: {
            graphId: context.graphId,
            nodeId: node.id,
            nodeType: node.type,
            inputs,
            executedSteps,
            context: {
                user: context.user,
                variables: context.variables,
                commandArguments: context.commandArguments,
            }
        }
    });

    return new Promise((resolve) => {
        pendingDebugRequests.set(requestId, resolve);

        const timeoutId = setTimeout(() => {
            if (pendingDebugRequests.has(requestId)) {
                pendingDebugRequests.delete(requestId);
                resolve(null);
            }
        }, debugConfig.STEP_MODE_TIMEOUT);

        pendingDebugRequests.set(`${requestId}_timeout`, timeoutId);
    });
}

module.exports = {
    attachDebugIpcHandler,
    checkBreakpointViaIpc,
    checkStepModeViaIpc,
    pendingDebugRequests
};