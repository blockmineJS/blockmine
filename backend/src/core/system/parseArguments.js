// backend/src/core/system/parseArguments.js

function parseArguments(message) {
    const args = [];
    let currentArg = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < message.length; i++) {
        const char = message[i];

        if ((char === '"' || char === "'") && !inQuotes) {
            inQuotes = true;
            quoteChar = char;
            continue;
        }

        if (char === quoteChar && inQuotes) {
            inQuotes = false;
            args.push(currentArg); 
            currentArg = '';
            continue;
        }

        if (char === ' ' && !inQuotes) {
            if (currentArg.length > 0) {
                args.push(currentArg);
                currentArg = '';
            }
            continue;
        }

        currentArg += char;
    }

    if (currentArg.length > 0) {
        args.push(currentArg);
    }
    
    return args.filter(arg => arg !== '');
}

module.exports = { parseArguments };