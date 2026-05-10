const prismaService = require('../../PrismaService');
const prisma = prismaService.getClient();

async function execute(node, context, helpers) {
    const { resolvePinValue, traverse } = helpers;

    const pluginName = await resolvePinValue(node, 'plugin_name', node.data?.plugin_name || '');
    const key = await resolvePinValue(node, 'key', node.data?.key || '');
    const value = await resolvePinValue(node, 'value', null);

    if (pluginName && key) {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        await prisma.pluginDataStore.upsert({
            where: { pluginName_botId_key: { pluginName, botId: context.botId, key } },
            update: { value: stringValue },
            create: { pluginName, botId: context.botId, key, value: stringValue }
        });
    }

    await traverse(node, 'exec');
}

module.exports = { execute };
