/**
 * @param {object} node - The node instance from the graph.
 * @param {object} context - The execution context.
 * @param {object} helpers - Execution helpers.
 * @param {function} helpers.resolvePinValue - Function to resolve a pin's value.
 * @param {function} helpers.traverse - Function to continue execution to the next node.
 */
async function execute(node, context, helpers) {
    const value = await helpers.resolvePinValue(node, 'value');
    console.log('[Graph Debug]', value);
    await helpers.traverse(node, 'exec');
}

module.exports = {
    execute,
};
