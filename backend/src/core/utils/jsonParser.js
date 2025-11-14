function safeJsonParse(jsonString, defaultValue = null, context = 'unknown') {
    if (jsonString === null || jsonString === undefined) {
        return defaultValue;
    }

    if (typeof jsonString !== 'string') {
        return jsonString;
    }

    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error(`[JSONParser] Failed to parse JSON in ${context}:`, error.message);
        return defaultValue;
    }
}

module.exports = { safeJsonParse };
