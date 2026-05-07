const prismaService = require('../../PrismaService');
const prisma = prismaService.getClient();

async function evaluate(node, pinId, context, helpers) {
    if (pinId !== 'value') return null;
    const { resolvePinValue } = helpers;

    const pluginName = await resolvePinValue(node, 'plugin_name', node.data?.plugin_name || '');
    const key = await resolvePinValue(node, 'key', node.data?.key || '');

    if (!pluginName || !key) return null;

    const row = await prisma.pluginDataStore.findUnique({
        where: { pluginName_botId_key: { pluginName, botId: context.botId, key } }
    });

    if (!row) return null;

    try {
        return JSON.parse(row.value);
    } catch {
        return row.value;
    }
}

module.exports = { evaluate };
