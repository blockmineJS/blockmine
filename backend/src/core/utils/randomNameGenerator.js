/**
 * Генератор случайных имен для ботов Minecraft
 * Создает уникальные имена в формате прилагательное + существительное + число
 */

const adjectives = [
    'Swift', 'Bold', 'Wise', 'Brave', 'Quick',
    'Dark', 'Light', 'Fire', 'Ice', 'Storm',
    'Shadow', 'Thunder', 'Silent', 'Wild', 'Noble',
    'Iron', 'Steel', 'Golden', 'Silver', 'Crystal',
    'Mystic', 'Ancient', 'Royal', 'Epic', 'Legendary'
];

const nouns = [
    'Warrior', 'Miner', 'Builder', 'Hunter', 'Trader',
    'Knight', 'Wizard', 'Ranger', 'Slayer', 'Crafter',
    'Archer', 'Fighter', 'Guardian', 'Keeper', 'Seeker',
    'Rider', 'Walker', 'Runner', 'Jumper', 'Climber',
    'Master', 'Lord', 'King', 'Hero', 'Champion'
];

/**
 * Генерирует случайное имя для бота
 * @returns {string} Случайное имя в формате "AdjectiveNoun123"
 */
function generateRandomBotName() {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 1000); // 0-999

    return `${adjective}${noun}${number}`;
}

/**
 * Генерирует уникальное имя, проверяя список существующих
 * @param {string[]} existingNames - Массив уже существующих имен
 * @param {number} maxAttempts - Максимальное количество попыток (по умолчанию 100)
 * @returns {string} Уникальное имя или резервное имя с timestamp если не удалось сгенерировать уникальное
 */
function generateUniqueBotName(existingNames = [], maxAttempts = 100) {
    const existingNamesSet = new Set(existingNames.map(name => name.toLowerCase()));

    for (let i = 0; i < maxAttempts; i++) {
        const name = generateRandomBotName();
        if (!existingNamesSet.has(name.toLowerCase())) {
            return name;
        }
    }

    // Если не удалось сгенерировать уникальное имя, добавляем timestamp
    return `Bot${Date.now()}`;
}

module.exports = {
    generateRandomBotName,
    generateUniqueBotName
};
