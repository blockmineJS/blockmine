const fs = require('fs');
const path = require('path');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');

const registerBotTools = require('./tools/bots');
const registerPluginTools = require('./tools/plugins');
const registerPluginIdeTools = require('./tools/pluginIde');
const registerManagementTools = require('./tools/management');

const { version: PKG_VERSION } = require('../../../../package.json');

const PLUGIN_AUTHOR_PROMPT_PATH = path.join(__dirname, '..', '..', 'ai', 'plugin-assistant-system-prompt.md');
let _pluginAuthorPromptCache = null;
function loadPluginAuthorPrompt() {
    if (_pluginAuthorPromptCache !== null) return _pluginAuthorPromptCache;
    try {
        _pluginAuthorPromptCache = fs.readFileSync(PLUGIN_AUTHOR_PROMPT_PATH, 'utf-8');
    } catch (e) {
        console.error('[MCP] Failed to load plugin-author prompt:', e.message);
        _pluginAuthorPromptCache = 'Plugin author guide is unavailable (file missing).';
    }
    return _pluginAuthorPromptCache;
}

function buildMcpServer(ctx) {
    const server = new McpServer({
        name: 'blockmine',
        version: PKG_VERSION,
    });

    registerBotTools(server, ctx);
    registerPluginTools(server, ctx);
    registerPluginIdeTools(server, ctx);
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

When the user is asked to author a plugin, fetch the dedicated "plugin-author" prompt (prompts/get) — it carries the full plugin-development guide.

When the user writes in Russian, answer in Russian.`,
            },
        }],
    }));

    server.registerPrompt('plugin-author', {
        description: 'Full guide for authoring BlockMine plugins (structure, manifest, settings, commands, events, plugin registry, examples, best practices). Use this when the user asks to create or modify a plugin.',
    }, () => ({
        messages: [{
            role: 'user',
            content: {
                type: 'text',
                text: loadPluginAuthorPrompt(),
            },
        }],
    }));

    return server;
}

module.exports = { buildMcpServer };
