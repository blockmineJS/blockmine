const { randomUUID } = require('crypto');
const debugConfig = require('../config/debug.config');

const pendingDebugRequests = new Map();

function settleRequest(requestId, value) {
    const entry = pendingDebugRequests.get(requestId);
    if (!entry) return;
    if (entry.timeoutId) clearTimeout(entry.timeoutId);
    pendingDebugRequests.delete(requestId);
    entry.resolve(value);
}

function handleDebugResponse(message) {
    settleRequest(message.requestId, message.overrides);
}

function attachDebugIpcHandler() {
    if (process.on && !attachDebugIpcHandler._attached) {
        process.on('message', (message) => {
            if (message?.type === 'debug:breakpoint_response' || message?.type === 'debug:step_response') {
                handleDebugResponse(message);
            }
        });
        attachDebugIpcHandler._attached = true;
    }
}

function sendDebugRequest(messageType, node, context, inputs, executedSteps, timeoutMs) {
    const requestId = randomUUID();

    process.send({
        type: messageType,
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
            },
        },
    });

    return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
            settleRequest(requestId, null);
        }, timeoutMs);

        pendingDebugRequests.set(requestId, { resolve, timeoutId });
    });
}

async function checkBreakpointViaIpc(node, context, captureNodeInputs, currentTraceId, traceCollector) {
    const inputs = await captureNodeInputs(node);
    const executedSteps = currentTraceId ? await traceCollector.getTrace(currentTraceId) : null;
    return sendDebugRequest('debug:check_breakpoint', node, context, inputs, executedSteps, debugConfig.BREAKPOINT_TIMEOUT);
}

async function checkStepModeViaIpc(node, context, captureNodeInputs, currentTraceId, traceCollector) {
    const inputs = await captureNodeInputs(node);
    const executedSteps = currentTraceId ? await traceCollector.getTrace(currentTraceId) : null;
    return sendDebugRequest('debug:check_step_mode', node, context, inputs, executedSteps, debugConfig.STEP_MODE_TIMEOUT);
}

attachDebugIpcHandler();

module.exports = {
    attachDebugIpcHandler,
    checkBreakpointViaIpc,
    checkStepModeViaIpc,
    pendingDebugRequests,
};
