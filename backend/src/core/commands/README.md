

> ⚠️ **АХТУНГ**: ДОКУМЕНТАЦИЯ СГЕНЕРИРОВАНА @CLAUDE.

# Создание команд для BlockMine

Система команд BlockMine поддерживает две сигнатуры для handler'ов: **старую** (обратно совместимую) и **новую** (с CommandContext).

## 📋 Две сигнатуры команд

### 1️⃣ Старая сигнатура (рекомендуется для простых команд)

```javascript
async handler(bot, typeChat, user, args) {
    // bot - экземпляр бота
    // typeChat - тип чата ('chat', 'clan', 'private', 'websocket', etc)
    // user - User объект с методами (hasPermission, addGroup, etc)
    // args - объект с аргументами команды

    const message = `Привет, ${user.username}!`;

    // Для WebSocket API нужно вернуть результат
    if (typeChat === 'websocket') {
        return message;
    }

    // Для остальных отправляем в чат
    bot.sendMessage(typeChat, message, user.username);
}
```

### 2️⃣ Новая сигнатура (рекомендуется для универсальных команд)

```javascript
async handler(context) {
    // context.bot - экземпляр бота
    // context.user - User объект с методами
    // context.args - объект с аргументами
    // context.transport - Transport объект
    // context.typeChat - тип чата (для совместимости)

    const message = `Привет, ${context.user.username}!`;

    // context.reply() автоматически работает для всех транспортов
    return context.reply(message);
}
```

## ✨ Автоматическое определение сигнатуры

Система **автоматически** определяет какую сигнатуру использует команда:

- **4 параметра** (`handler(bot, typeChat, user, args)`) → старая сигнатура
- **1 параметр** (`handler(context)`) → новая сигнатура

Вы можете использовать любую из них!

## 📖 Примеры команд

### Пример 1: Простая команда (старая сигнатура)

```javascript
const Command = require('../system/Command');

class HelloCommand extends Command {
    constructor() {
        super({
            name: 'hello',
            description: 'Поздороваться с пользователем',
            aliases: ['hi', 'привет'],
            cooldown: 5,
            permissions: 'user.say',
            owner: 'system',
            allowedChatTypes: ['chat', 'clan', 'private', 'websocket'],
            args: []
        });
    }

    async handler(bot, typeChat, user) {
        const message = `Привет, ${user.username}!`;

        if (typeChat === 'websocket') {
            return message;
        }

        bot.sendMessage(typeChat, message, user.username);
    }
}

module.exports = HelloCommand;
```

### Пример 2: Команда с аргументами (старая сигнатура)

```javascript
const Command = require('../system/Command');

class SayCommand extends Command {
    constructor() {
        super({
            name: 'say',
            description: 'Отправить сообщение от имени бота',
            cooldown: 3,
            permissions: 'admin.say',
            owner: 'system',
            allowedChatTypes: ['chat', 'clan', 'websocket'],
            args: [
                {
                    name: 'message',
                    type: 'greedy_string',
                    required: true,
                    description: 'Текст сообщения'
                }
            ]
        });
    }

    async handler(bot, typeChat, user, { message }) {
        if (typeChat === 'websocket') {
            bot.sendMessage('chat', message);
            return `Сообщение отправлено: "${message}"`;
        }

        bot.sendMessage('chat', message);
    }
}

module.exports = SayCommand;
```

### Пример 3: Универсальная команда (новая сигнатура)

```javascript
const Command = require('../system/Command');

class InfoCommand extends Command {
    constructor() {
        super({
            name: 'info',
            description: 'Информация о пользователе',
            cooldown: 10,
            permissions: 'user.info',
            owner: 'system',
            allowedChatTypes: ['chat', 'private', 'websocket'],
            args: [
                {
                    name: 'target',
                    type: 'string',
                    required: false,
                    description: 'Имя пользователя'
                }
            ]
        });
    }

    async handler(context) {
        const targetUsername = context.args.target || context.user.username;

        // Получаем данные о пользователе
        const targetUser = await context.bot.api.getUser(targetUsername);

        const groups = targetUser.groups.map(g => g.group.name).join(', ');
        const message = `👤 ${targetUser.username}\n📋 Группы: ${groups}`;

        // Автоматически работает для всех транспортов
        return context.reply(message);
    }
}

module.exports = InfoCommand;
```

### Пример 4: Команда с методами User (новая сигнатура)

```javascript
const Command = require('../system/Command');

class PromoteCommand extends Command {
    constructor() {
        super({
            name: 'promote',
            description: 'Повысить пользователя до VIP',
            cooldown: 0,
            permissions: 'admin.promote',
            owner: 'system',
            allowedChatTypes: ['chat', 'private', 'websocket'],
            args: [
                {
                    name: 'username',
                    type: 'string',
                    required: true,
                    description: 'Имя пользователя'
                }
            ]
        });
    }

    async handler(context) {
        const targetUsername = context.args.username;

        // Получаем полноценный User объект с методами
        const targetUser = await context.bot.api.getUser(targetUsername);

        // Используем методы User
        if (targetUser.hasPermission('vip.*')) {
            return context.reply(`${targetUsername} уже VIP!`);
        }

        await targetUser.addGroup('vip');
        return context.reply(`✅ ${targetUsername} повышен до VIP!`);
    }
}

module.exports = PromoteCommand;
```

## 🔄 Transport и CommandContext API

### CommandContext

```javascript
class CommandContext {
    bot          // Экземпляр бота
    user         // User объект с методами
    args         // Объект с аргументами
    transport    // Transport объект
    typeChat     // Тип чата (для обратной совместимости)

    // Методы
    reply(message)                           // Отправить ответ пользователю
    sendTo(chatType, message, recipient)     // Отправить в конкретный чат
    isWebSocket()                            // Проверка на WebSocket API
    isMinecraft()                            // Проверка на Minecraft
    getTransportName()                       // Получить название транспорта
}
```

### Transport

```javascript
class Transport {
    type         // 'websocket' | 'chat' | 'clan' | 'private' | 'telegram'
    bot          // Экземпляр бота

    // Методы
    send(message, recipient)          // Отправить сообщение
    isMinecraftTransport()            // Проверка на Minecraft
    isUniversal()                     // Проверка на универсальный транспорт
    isAllowedFor(allowedTypes)        // Проверка разрешений
    getDisplayName()                  // Получить читаемое название
}
```

## 🎯 Когда использовать какую сигнатуру?

### Используйте **старую сигнатуру** если:
- ✅ Команда простая и не требует сложной логики
- ✅ Не нужны методы User (hasPermission, addGroup, etc)
- ✅ Вы портируете существующие команды
- ✅ Команда работает только в Minecraft

### Используйте **новую сигнатуру** если:
- ✅ Команда должна работать везде (Minecraft, WebSocket)
- ✅ Нужны методы User (для управления группами, проверки прав и т.д.)
- ✅ Команда сложная и требует чистого кода
- ✅ Вы пишете новую команду с нуля

## 🚀 Будущие транспорты

Архитектура готова к добавлению новых транспортов:

- **WebSocket API** ✅ (уже работает)
- **Minecraft** ✅ (уже работает)

Команды с новой сигнатурой (`handler(context)`) будут **автоматически** работать во всех транспортах!

## 📝 Важные замечания

1. **User восстановление**: User объект полностью восстанавливается в child process с помощью `UserService.getUser()`, поэтому все методы класса User доступны в командах.

2. **Кэширование User**: UserService использует кэш, поэтому повторные вызовы `getUser()` не создают лишних запросов к БД.

3. **WebSocket результаты**: Для WebSocket API команды должны либо **вернуть** результат через `return`, либо вызвать `context.reply()` (в новой сигнатуре).

4. **Обратная совместимость**: Все существующие команды продолжают работать без изменений!

## 🔍 Как система определяет сигнатуру

Магия в `BotProcess.js`:

```javascript
// Проверяем количество параметров функции handler
const handlerParamCount = commandInstance.handler.length;

if (handlerParamCount === 1) {
    // Новая сигнатура: handler(context)
    const context = new CommandContext(bot, user, args, transport);
    await commandInstance.handler(context);
} else {
    // Старая сигнатура: handler(bot, typeChat, user, args)
    await commandInstance.handler(bot, typeChat, user, args);
}
```

Система **автоматически** выбирает правильный способ вызова!
