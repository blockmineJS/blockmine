async function executor(node, context, helpers) {
    const { resolvePinValue, traverse, memo } = helpers;

    const selectedEventId = node.data?.selectedEventId;
    if (!selectedEventId) {
        await traverse(node, 'exec');
        return;
    }

    const targetNode = this.activeGraph.nodes.find(n => n.id === selectedEventId);
    if (!targetNode || targetNode.type !== 'event:custom_event') {
        await traverse(node, 'exec');
        return;
    }

    const eventPins = targetNode.data?.pins || [];
    for (const pin of eventPins) {
        if (pin.type === 'Exec') continue;
        const value = await resolvePinValue(node, pin.id);
        memo.set(`${targetNode.id}:${pin.id}`, value);
    }

    const cacheKey = `${targetNode.id}_executed`;
    memo.delete(cacheKey);

    await traverse(targetNode, 'exec');

    await traverse(node, 'exec');
}

module.exports = { executor };
