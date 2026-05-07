const BreakLoopSignal = require('../../BreakLoopSignal');

async function execute(node, context, helpers) {
    const { resolvePinValue, traverse, clearLoopBodyMemo, memo } = helpers;

    const intervalSec = await resolvePinValue(node, 'interval', 1);
    const maxTicks = await resolvePinValue(node, 'max_ticks', 0);
    const intervalMs = Math.max(100, (intervalSec || 1) * 1000);

    let tick = 0;

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        while (maxTicks === 0 || tick < maxTicks) {
            memo.set(`${node.id}:tick`, tick);
            clearLoopBodyMemo(node);
            await traverse(node, 'loop_body');
            tick++;
            await delay(intervalMs);
        }
    } catch (e) {
        if (!(e instanceof BreakLoopSignal)) throw e;
    }

    await traverse(node, 'completed');
}

async function evaluate(node, pinId, context, helpers) {
    const { memo } = helpers;
    if (pinId === 'tick') return memo.get(`${node.id}:tick`) ?? 0;
    return null;
}

module.exports = { execute, evaluate };
