# Плагины BlockMine

Это контракт API плагина. Его достаточно, чтобы написать плагин. Если чего-то здесь нет, исходники панели можно читать.

Живой образец важнее выдуманной архитектуры. Перед новым плагином открой уже установленный того же вида через `read_plugin_file`: команда — `base-commands` или `article-command`, сырой чат — `anti-tp-keksik` или `parser-keksik`, роли клана — `clan-role-manager`.

## Как вызывать инструменты

Файлы плагина живут на машине, где запущена панель: `~/.blockmine/storage/plugins/bot_<id>/<slug>/`. Это не каталог репозитория.

1. Новый плагин: `create_plugin(botId, name, template)`. `template` — `empty` или `command`. Имя становится slug папки. Свежий `package.json` содержит `botpanel.dependencies` массивом `[]`. Когда пишешь свой `package.json`, замени его на объект. Нет зависимостей — пустой объект `{}`.
2. Код: `write_plugin_file`. Запись `package.json` обновляет в базе имя, версию и `botpanel`.
3. Правка: `read_plugin_file`, `list_plugin_files`.
4. Применить: `reload_plugin`. Это перезапуск бота, горячей подмены файлов нет. Бот заново логинится.
5. Загрузка: `get_bot_logs`. Строка загрузки плагина и `error.stack` видны там. `get_bot_plugins` показывает, что плагин включён. Игровую проверку сам не запускай, см. раздел «Проверка».

`install_plugin` ставит чужой репозиторий. Свой код пишется через `create_plugin` и `write_plugin_file`.

## Как игрок вызывает команду

Префикс бота — `bot.config.prefix`, по умолчанию `@`. Игрок пишет `@мут Nick причина`. Панель до обработчика сама проверяет чёрный список, что команда включена, тип чата, обязательные аргументы, право и кулдаун. В обработчике это не повторять.

Нет права — игроку уходит «У вас нет прав…». Нет обязательного аргумента — текст «Необходимо указать» и строка использования. Чужой тип чата для обычного игрока молча игнорируется, сообщения нет. Поэтому в `allowedChatTypes` сразу перечисли все нужные типы.

Владелец обходит чёрный список, выключенную команду, тип чата, право и кулдаун. Кроме `bot.owners`, на `mc.mineblaze.net`, `mc.masedworld.net`, `mc.cheatmine.net` и `mc.dexland.org` владельцами всегда считаются `merka` и `akrem`. На них нельзя проверять, что право реально режет доступ.

Кулдаун задаётся числом секунд в команде. Обход — право `<домен>.cooldown.bypass`, где домен — часть имени права до первой точки (`clan.mute` → `clan.cooldown.bypass`). Успешный запуск кулдаун оставляет. Падение обработчика его снимает.

## Каркас

```
my-plugin/
  package.json
  index.js
  constants.js
  commands/mute.js
  lib/whatever.js
```

Точка входа — `botpanel.main`, если его нет, то `index.js`. Поле `main` в корне `package.json` загрузчик не читает.

Два рабочих экспорта. Оба получают `(bot, options)`.

```javascript
async function onLoad(bot, options) {}
async function onUnload({ botId, prisma }) {}
module.exports = { onLoad, onUnload };
```

```javascript
module.exports = (bot, options) => {};
```

`options.settings` — настройки из манифеста, уже слитые с сохранёнными. `options.store` — своё key-value хранилище. `options.console` — логгер с именем плагина.

`onUnload` вызывается при удалении плагина, не при каждом рестарте. В нём удали команды и права, которые плагин создал. `prisma` есть только здесь.

```javascript
async function onUnload({ botId, prisma }) {
    await prisma.command.deleteMany({ where: { botId, owner: PLUGIN_OWNER_ID } });
    await prisma.permission.deleteMany({ where: { botId, owner: PLUGIN_OWNER_ID } });
}
```

Слушатели, повешенные в `onLoad`, сними в `bot.once('end', ...)`. Иначе после рестарта внутри одного процесса они копятся. `require` кэша при рестарте бота нет: процесс новый.

Комментарии в коде плагина не пиши. Русский текст пиши как русский текст, не как `\uXXXX`.

## package.json

```json
{
  "name": "clan-mute",
  "version": "1.0.0",
  "description": "Коротко, что делает плагин",
  "author": "merka",
  "dependencies": {},
  "botpanel": {
    "main": "index.js",
    "icon": "VolumeX",
    "categories": ["Clan"],
    "supportedHosts": ["mc.masedworld.net"],
    "dependencies": { "parser-keksik": "*" },
    "settings": {
      "doneMessage": {
        "type": "string",
        "label": "Ответ после мута",
        "description": "Плейсхолдеры: {player}, {reason}",
        "default": "&aМут выдан &e{player}&a. Причина: &f{reason}"
      }
    }
  }
}
```

`dependencies` в корне — npm-пакеты. Панель ставит их сама, `node_modules` в плагин не клади.

`botpanel.dependencies` — другие плагины, объект имя → версия (`*` или `^1.0.0`), не массив. Пустой `supportedHosts` значит «любой сервер». `icon` — имя из Lucide в PascalCase.

Настройки, которые рисует панель:

| type | что это |
|---|---|
| `string` | строка. `secret: true` прячет значение и маскирует его как `********` |
| `number` | число |
| `boolean` | переключатель |
| `string[]` | список, в UI каждая строка — элемент. `secret: true` тоже работает |
| `select` | варианты: строки или `{ "value", "label" }`. Сохраняется `value` |
| `json` / `json_file` | объект. У `json_file` есть `defaultPath` внутри папки плагина |
| `proxy` | `{ enabled, proxyId, host, port, type, username, password }`. `type`: `socks5`, `socks4`, `http` |

`default` загрузчик прогоняет через `JSON.parse`. Строка `"true"` станет boolean, `"10"` станет числом. Невалидный JSON остаётся как есть, поэтому `"default": "привет"` остаётся строкой. Сохранённые настройки перекрывают default.

`dependsOn` прячет поле, пока условие ложно. Одно условие или массив (все сразу). Операторы: `eq` (по умолчанию), `ne`, `gt`, `gte`, `lt`, `lte`. `value` может быть массивом допустимых значений. `invert: true` переворачивает результат.

Поля настроек пиши плоским списком. В коде это `settings.doneMessage`. Верхний ключ с `label` и без `type` панель рисует группой, но загрузчик бота читает только верхний уровень. У такого ключа нет своего `default`, в `options.settings` он попадает как `null`, и вложенные default при старте бота не применяются. После сохранения из панели те же поля лежат плоско, без имени группы.

Тексты, которые видит игрок, клади в settings с русским default и плейсхолдерами `{player}`. Отдельный каркас локалей не нужен, пока его не просят. Английский вариант — второе поле или `select` языка, не своя система переводов.

## Команда

`PLUGIN_OWNER_ID` вида `plugin:clan-mute` пишется в `owner` команды и права. По нему `onUnload` находит свои строки.

```javascript
const { PLUGIN_OWNER_ID, PERMISSION } = require('../constants');

module.exports = (bot) => {
    class MuteCommand extends bot.api.Command {
        constructor(settings) {
            super({
                name: 'mute',
                aliases: ['мут'],
                description: 'Выдать мут кланового чата',
                permissions: PERMISSION,
                owner: PLUGIN_OWNER_ID,
                cooldown: 3,
                allowedChatTypes: ['chat', 'private', 'clan'],
                args: [
                    { name: 'player', type: 'string', required: true, description: 'Ник' },
                    { name: 'reason', type: 'greedy_string', required: true, description: 'Причина' },
                ],
            });
            this.settings = settings;
        }

        async handler(bot, typeChat, user, { player, reason }) {
            const template = this.settings.doneMessage || '&aМут выдан &e{player}&a. Причина: &f{reason}';
            const text = template.replaceAll('{player}', player).replaceAll('{reason}', reason);
            bot.api.sendMessage(typeChat, text, user.username);
        }
    }
    return MuteCommand;
};
```

```javascript
const createMuteCommand = require('./commands/mute');

async function onLoad(bot, { settings }) {
    const MuteCommand = createMuteCommand(bot);
    await bot.api.registerCommand(new MuteCommand(settings));
    await bot.api.registerPermissions([
        { name: PERMISSION, description: 'Мут кланового чата', owner: PLUGIN_OWNER_ID },
    ]);
    await bot.api.addPermissionsToGroup('Admin', [PERMISSION]);
    bot.sendLog('[clan-mute] Загружен');
}
```

Сигнатура обработчика строго `handler(bot, typeChat, user, args)`. `user.username` — ник того, кто написал команду.

Аргументы:

| type | смысл |
|---|---|
| `string` | одно слово |
| `number` | число, иначе игроку пишут, что аргумент должен быть числом |
| `greedy_string` | весь остаток строки, в том числе с пробелами |
| `boolean` | как одно слово |

У аргумента есть `name`, `required`, `description`, необязательный `default`. `description` попадает в текст «Необходимо указать».

Повторный `registerCommand` не перевешивает право, если оно уже привязано. Меняются описание, алиасы, кулдаун и типы чата. Имя команды — ключ. Новое имя — новая команда, старую убери в `onUnload` или она останется.

Пустая строка `permissions` значит «права нет, команда доступна всем, кто прошёл остальные проверки».

`await registerCommand` сам создаёт строку права в базе и только потом возвращается. `registerPermissions`, `registerGroup` и `addPermissionsToGroup` лишь шлют сообщение в панель: `await` на них не ждёт запись. Если выдать право группе раньше, чем строка права появилась, панель пропускает выдачу. Поэтому сначала `await registerCommand`, и только потом `addPermissionsToGroup`. Описание права можно дописать через `registerPermissions` в любой момент после этого.

`addPermissionsToGroup('Admin', ['clan.mute'])` не даёт это право само. `admin.*` покрывает только имена, которые начинаются с `admin.`. `clan.*` покрывает `clan.mute`. `*` покрывает всё. Чужой домен сам не подхватывается.

Группа `Admin` и группа `User` есть сразу. `User` имеет `user.say`. Новую группу создаёт `registerGroup({ name, owner, permissions })`, но права в списке должны уже существовать.

Цвета сообщения: `&0`–`&9`, `&a`–`&f`, `&l` жирный, `&n`, `&o`, `&m`, `&r` сброс. Очередь их не перекодирует, их понимает клиент сервера.

## Сообщения бота

```javascript
bot.api.sendMessage('chat', 'текст');
bot.api.sendMessage('private', 'текст', 'Nick');
bot.api.sendMessage('command', '/spawn');
bot.api.sendMessage('clan', 'клану');
bot.api.sendMessage('global', 'глобальный');
```

Третий аргумент нужен для `private`: уходит как `/msg Nick текст`. Неизвестный тип чата молча выбрасывается.

`sendMessage` режет текст по переводам строки и ставит каждую часть в очередь отдельно. Несколько строк ответа — несколько вызовов. В аргумент серверной команды перевод строки не подставляй: `/c mute` уходит одной строкой, причина тоже одна строка.

Без `parser-keksik` зарегистрированы только `command`, `chat` и `private`. На MineBlaze, MasedWorld, DexLand и CheatMine этот плагин добавляет:

| тип | что уходит в чат |
|---|---|
| `chat` | как есть, локальный |
| `global` | префикс `!` |
| `clan` | префикс `/cc ` |
| `private` | `/msg Nick ` |

Там же входящий чат становится событием `chat:message` с `type` `chat`, `global`, `clan` или `private`. Без парсера шёпот Mineflayer имеет тип `whisper`, а команда ждёт `private`, и у обычного игрока она не запускается. Для кланового чата в `botpanel.dependencies` укажи `parser-keksik`.

Ответ сервера на команду:

```javascript
const match = await bot.api.sendMessageAndWaitForReply(
    '/c mute Nick причина',
    [
        /выдал мут кланового чата\s+(\S+)\s+по причине:\s*(.*)\s*$/i,
        /не состоит в вашем клане/i,
        /уже замучен/i,
        /укажите причину мута/i,
        /укажите ник игрока/i,
    ],
    5000
);
```

В список шаблонов клади и успех, и известные отказы. Шаблон только на успех ждёт до таймаута, хотя сервер уже ответил ошибкой. Слушатель встаёт в момент реальной отправки, задержка очереди в таймаут не входит. Возвращается первый `RegExp` match, не вся строка и не все строки. `match[0]` — совпавший кусок, группы — то, что в скобках. Таймаут — отказ с `Error('Timeout')`. Текст уже без цветов (`toString()` сообщения). `bot.chat` не подменяй.

На MasedWorld клановый мут устроен так. Справка — `/c` без аргументов. `/c help` отвечает «Неизвестная подкоманда».

| команда | смысл |
|---|---|
| `/c mute [Игрок] [Причина]` | мут кланового чата. Причина обязательна, срока нет |
| `/c unmute [Игрок]` | снять мут |
| `/c mutelist` или `/c mutelist [Страница]` | текущие муты. После снятия список пустой |

Успех мута: `выдал мут кланового чата <ник> по причине: <текст>`. Отказы: `Укажите ник игрока.`, `Укажите причину мута.`, `Игрок не состоит в вашем клане.`, `Игрок уже замучен.` Успех снятия: `снял мут кланового чата с <ник>`. Если мута нет: `У игрока нет мута.` Пустой список: `Нет истории мутов`. Строка списка: `<кто> замучен <ник> в дд.мм.гг чч:мм:сс по причине '<текст>'`.

Несколько строк одним `sendMessageAndWaitForReply` не собрать. Для списка повесь `core:raw_message` до вызова, оставь только нужные строки и сними слушатель в `finally` и на `bot.once('end')`. Слушатель, повешенный раньше отправки, видит и чужой чат, пока команда стоит в очереди, поэтому фильтр обязателен. После первого совпадения подожди короткое окно, чтобы добрать соседние строки списка.

```javascript
const lines = [];
const onRaw = (rawText) => {
    const text = String(rawText || '').replace(/\s+/g, ' ').trim();
    if (/нет истории мутов/i.test(text) || /замучен\s+\S+\s+в\s+\d{2}\.\d{2}\.\d{2}/i.test(text)) {
        lines.push(text);
    }
};
bot.events.on('core:raw_message', onRaw);
const onEnd = () => bot.events.removeListener('core:raw_message', onRaw);
bot.once('end', onEnd);
try {
    await bot.api.sendMessageAndWaitForReply(
        '/c mutelist',
        [/нет истории мутов/i, /замучен\s+\S+/i],
        5000
    );
    await new Promise((resolve) => setTimeout(resolve, 700));
} finally {
    bot.events.removeListener('core:raw_message', onRaw);
    bot.removeListener('end', onEnd);
}
```

`get_chat_history` хранит только то, что парсер признал репликой игрока. Ответ сервера на `/c mute` туда часто не попадает. Он есть в `get_bot_logs` (ANSI-текст). В логе окно примерно из последних 200 строк, `offset` 0 — самые старые из окна. `replies` у `send_message_to_bot` — это тоже разбор парсера. Справка `/c` режется на фальшивые ники вроде `mute` и `list`. Для ответа сервера читай лог.

Команда сервера (`/c mute`) и команда бота (`@мут`) — разные вещи. Плагин по `@мут` сам вызывает `sendMessageAndWaitForReply('/c mute ...')` или `sendMessage('command', '/c mute ...')`.

## События

```javascript
bot.on('playerJoined', (player) => {});
bot.on('whisper', (username, message) => {});
bot.events.on('core:raw_message', (rawText, jsonMsg) => {});
bot.events.on('chat:message', ({ type, username, message }) => {});
```

`core:raw_message` — каждая строка сервера обычным текстом, плюс JSON чата. `chat:message` — уже разобранная реплика игрока.

Снятый слушатель:

```javascript
const onRaw = (rawText) => {};
bot.events.on('core:raw_message', onRaw);
bot.once('end', () => {
    bot.events.removeListener('core:raw_message', onRaw);
});
```

На серверах с кланом `clan-events-keksik` шлёт `clan:player_joined`, `clan:player_left`, `clan:player_kicked` (объект с `username`, у кика ещё `kickedBy`). `clan-role-manager` за это выдаёт и забирает группу `Member` и право `member.say`. Своё клановое право вешай на `Member` или на отдельную группу, не вычисляй модераторов клана из чата, если пользователь просит обычное право.

Полезные поля бота: `bot.username`, `bot.entity`, `bot.players`, `bot.config` (`id`, `prefix`, `server.host`). Лог в консоль панели: `bot.sendLog('[plugin] текст')`.

## Игроки, группы, права

`bot.api.getUser(username)` создаёт игрока, если его ещё нет, и кладёт в группу `User`. Это не чтение. Ник в базе в нижнем регистре.

У объекта есть `username`, `isOwner`, `isBlacklisted`, `groups`, `hasPermission(name)`, `hasGroup(name)`, `addGroup(name)`, `removeGroup(name)`.

Действия через панель, чтобы кэш прав панели увидел изменение сразу:

```javascript
await bot.api.performUserAction(username, 'getGroups');
await bot.api.performUserAction(username, 'getPermissions');
await bot.api.performUserAction(username, 'addGroup', { group: 'Member' });
await bot.api.performUserAction(username, 'removeGroup', { group: 'Member' });
await bot.api.performUserAction(username, 'isBlacklisted');
await bot.api.performUserAction(username, 'setBlacklisted', { value: true });
```

Других имён действий нет. Ключ группы — `group`, не `groupName`. `removeGroup` падает, если игрока в группе нет: сначала `getGroups`. Таймаут действия — 10 секунд.

`bot.api.installedPlugins` — список имён на момент старта процесса, не живой реестр.

## Хранилище

`options.store`: `get(key)` (нет ключа → `null`), `set(key, value)`, `delete(key)`, `has(key)`, `getAll()` → `Map`. Значение должно класться в JSON, ключ до 512 символов, значение до 1 МБ. Переживает рестарт. При `onUnload` само не стирается. Стирается отдельным сбросом данных плагина или удалением плагина.

## Между плагинами

```javascript
module.exports = {
    onLoad,
    onUnload,
    exports: { doThing: async () => {} },
};
```

Потребитель: `bot.pluginRegistry.get('other-plugin')`. Нет плагина — `undefined`. Порядок загрузки не гарантирован. Зависимость пиши в `botpanel.dependencies`.

## Проверка

После `reload_plugin` посмотри лог: строка загрузки есть, `error.stack` нет. `get_plugin_settings` показывает схему из `botpanel`. Это проверка загрузки, её делай всегда.

Игровую проверку сам не начинай. Она нужна только если об этом прямо попросили.

Проверяй аккаунтом бота. Серверную команду шли через `send_message_to_bot` с `chatType: command`, например `/c mute Nick причина`. Ответ читай в `get_bot_logs`.

Если попросили прогнать команду бота (`@мут`), выдай право нику бота: положи его в группу, у которой это право уже есть, или выдай право группе бота. Потом ту же отправку сделай текстом команды с префиксом бота. Чужого игрока не подставляй, пока его ник прямо не назвали для проверки.

README пиши, только если его просят. Способ установки в него не включай: плагин ставят из панели или через MCP.

## Чего не делать

- Не подменять `bot.chat`.
- Не проверять право, кулдаун и тип чата внутри `handler`.
- Не вызывать `addPermissionsToGroup` до `await registerCommand`.
- Не писать в `prisma` из `onLoad`. База плагина — `options.store`. `prisma` в `onUnload` только чтобы удалить свои команды и права.
- Не слать секрет в `bot.sendLog`. Поле с паролем или токеном помечай `secret: true`. Обратно в `update_plugin_settings` маска `********` означает «оставить как есть».
- Не проверять команду в игре по своей инициативе. Не писать чужому игроку и не мутить его, пока об этом прямо не попросили и не назвали ник.
