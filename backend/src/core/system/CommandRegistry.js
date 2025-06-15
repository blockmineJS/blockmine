const fs = require('fs/promises');
const path = require('path');

const commands = new Map();

async function loadCommands() {
    const commandsDir = path.resolve(__dirname, '../commands');
    const files = await fs.readdir(commandsDir);

    for (const file of files) {
        if (file.endsWith('.js')) {
            const CommandClass = require(path.join(commandsDir, file));
            const commandInstance = new CommandClass();
            commands.set(commandInstance.name, commandInstance);
        }
    }
    console.log(`[CommandRegistry] Загружено ${commands.size} команд.`);
    return commands;
}

module.exports = { loadCommands, commands };