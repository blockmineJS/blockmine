const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');

const registerBotTools = require('./tools/bots');
const registerPluginTools = require('./tools/plugins');
const registerManagementTools = require('./tools/management');

const { version: PKG_VERSION } = require('../../../../package.json');

function buildMcpServer(ctx) {
    const server = new McpServer({
        name: 'blockmine',
        version: PKG_VERSION,
    });

    registerBotTools(server, ctx);
    registerPluginTools(server, ctx);
    registerManagementTools(server, ctx);

    server.registerPrompt('blockmine-assistant', {
        description: 'Onboarding prompt explaining how to drive BlockMine through this MCP endpoint.',
    }, () => ({
        messages: [{
            role: 'user',
            content: {
                type: 'text',
                text: `You manage BlockMine — a Minecraft bot panel — through this MCP server.

Tools group into:
- Bot lifecycle: list_bots, get_bot, get_bot_states, start_bot, stop_bot, restart_bot, send_message_to_bot, get_bot_logs
- Plugins: get_bot_plugins, get_plugin_settings, get_plugin_store, update_plugin_settings, enable_disable_plugin, install_local_plugin
- Management: get_bot_users, get_user_info, get_bot_groups, get_bot_permissions, get_bot_commands

Authentication is per-request via Authorization: Bearer pk_... — the user is already authenticated when you call any tool. Permission errors will be returned in-line with success: false and the required permission name.

When the user writes in Russian, answer in Russian.`,
            },
        }],
    }));

    return server;
}

module.exports = { buildMcpServer };
