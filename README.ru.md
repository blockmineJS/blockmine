**🇷🇺 Русский** | [🇬🇧 English](./README.md)

<div align="center">
  <img src="./image/logo.png" alt="BlockMine Logo" width="150">

  <h1>BlockMine</h1>

  <p>
    <strong>Open-source Minecraft Bot Framework и Automation Platform</strong>
  </p>

  <p>
    Создавайте и управляйте Minecraft-ботами через веб-панель,
    визуальный редактор, плагины и API — без необходимости писать
    низкоуровневую логику с нуля.
  </p>

  <p>
    <a href="https://github.com/blockmineJS/blockmine/stargazers"><img src="https://img.shields.io/github/stars/blockmineJS/blockmine?style=for-the-badge&logo=github" alt="GitHub Stars"></a>
    <a href="https://github.com/blockmineJS/blockmine/commits/main"><img src="https://img.shields.io/github/last-commit/blockmineJS/blockmine?style=for-the-badge&logo=git" alt="Last Commit"></a>
    <a href="http://212.22.78.42:3000/api/stats" target="_blank"><img src="https://img.shields.io/endpoint?url=https://blockmine-proxy.vercel.app/api/shield&style=for-the-badge&logo=minecraft&logoColor=white" alt="Bots Online"></a>
  </p>
</div>

---

## Что такое BlockMine?

**BlockMine** — это open-source **Minecraft bot framework**, **Minecraft automation platform** и веб-панель для создания и управления Minecraft-ботами.

BlockMine построен как готовая среда для автоматизации Minecraft. Вместо того чтобы самостоятельно реализовывать управление ботами, команды, плагины, права, расписание, отладку и управление несколькими аккаунтами, вы получаете всё это в одной панели.

BlockMine поддерживает два основных подхода:

* **No-Code** — создание поведения Minecraft-ботов через визуальный редактор.
* **Code / Low-Code** — разработка JavaScript-плагинов и собственных нод.

Проект подходит как для простых AFK-ботов и серверных помощников, так и для сложной автоматизации, клановых ботов, мониторинга, серверных интеграций и AI-controlled Minecraft bots.

### Для чего можно использовать BlockMine?

* Minecraft clan bots
* AFK-боты
* Боты для модерации
* Мониторинг Minecraft-серверов
* Логирование событий
* Economy / экономические боты
* Farming / resource bots
* Боты для автоматизации серверных задач
* Multi-account Minecraft automation
* Minecraft NPC и помощники
* PvP / guard bots
* Интеграция Minecraft с внешними сервисами
* Discord / Telegram-интеграции
* Серверное тестирование
* AI-controlled Minecraft bots
* Собственные Minecraft automation scripts

### Почему BlockMine?

BlockMine объединяет в одной системе:

* Minecraft bot runtime
* Web dashboard
* Multi-bot management
* No-Code visual scripting
* JavaScript plugins
* Custom visual nodes
* Plugin marketplace
* Permissions и groups
* Cron scheduler
* WebSocket API
* MCP Server для AI-ассистентов
* Live Debugger
* Trace Viewer
* 3D Minecraft world viewer
* SOCKS5 proxy support
* Hot-reload

Больше примеров: [https://t.me/blockmineJs](https://t.me/blockmineJs)

---

## BlockMine и Mineflayer

Mineflayer — это API бота. BlockMine — framework вокруг него: панель, несколько ботов, плагины, визуальные сценарии, отладчик, WebSocket API и MCP уже собраны.

| Feature | Mineflayer | BlockMine |
|---|---|---|
| Minecraft bot API | ✅ | ✅ |
| Bot management | Manual | Built-in |
| Multiple bots | Manual | ✅ |
| Visual scripting | ❌ | ✅ |
| Plugin system | Via ecosystem | Built-in |
| Custom nodes | ❌ | ✅ |
| Web dashboard | Via plugins | Built-in |
| 3D viewer | Plugin | Built-in |
| Debugger | Manual | Built-in |
| Breakpoints | Manual | ✅ |
| Trace viewer | ❌ | ✅ |
| Permissions | Manual | Built-in |
| Cron scheduler | Manual | Built-in |
| WebSocket API | Manual | Built-in |
| MCP | ❌ | Built-in |
| Hot reload | Depends on setup | ✅ |

> **Ищете альтернативу Mineflayer или готовый framework для своих Minecraft-ботов?**
> В BlockMine уже есть runtime бота, веб-панель, система плагинов, визуальные сценарии, отладка, управление несколькими ботами, WebSocket API и MCP.

---

## 🚀 Основные возможности

### 🌐 Веб-панель и управление

* **Адаптивная веб-панель** на React и Tailwind CSS
* Управление с компьютера, планшета и телефона
* **Темная тема**
* **Real-time обновления** через WebSocket
* **Мультиязычность** — русский и английский языки
* Централизованное управление Minecraft-ботами

<p align="center">
  <img src="./screen/language_selector.png" alt="BlockMine language selector" width="400">
  <br>
  <em>Выбор языка интерфейса при первом запуске</em>
</p>

### 🎨 Визуальный редактор логики — No-Code

Создавайте сложную логику Minecraft-ботов без написания кода.

* **Drag-and-Drop** интерфейс
* Функциональные блоки (nodes)
* Создание сложных цепочек действий
* Создание команд
* Обработка Minecraft-событий
* Условия, циклы и ветвления
* **Live Debug** с брейкпоинтами
* Пошаговое выполнение
* **Trace Viewer**
* История выполнения
* Просмотр значений переменных
* Совместное редактирование графов несколькими пользователями

### 🤖 Multi-Bot Management

BlockMine позволяет управлять несколькими Minecraft-ботами из одной панели.

* **Запуск / остановка / перезапуск** в один клик
* Отдельная интерактивная консоль для каждого бота
* История консоли
* **Мониторинг CPU/RAM** в реальном времени
* **3D Viewer** — просмотр Minecraft мира глазами бота
* Индивидуальный **SOCKS5 proxy** для каждого бота
* Планировщик задач
* Централизованное управление ботами

<p align="center">
  <img src="./screen/3dviewer.png" alt="Minecraft 3D Viewer" width="100%">
  <br>
  <em>3D-просмотр мира Minecraft глазами бота в реальном времени</em>
</p>

### 🔌 Plugin System

Плагины позволяют программно расширять возможности BlockMine.

Плагин может:

* Добавлять новые команды
* Создавать новые ноды для визуального редактора
* Работать в фоне
* Интегрироваться с внешними сервисами
* Добавлять собственную логику Minecraft-бота

#### Plugin Marketplace

В BlockMine есть встроенный каталог плагинов:

* **Категории** — Ядро, Клан, Утилиты и другие
* **Поиск**
* **Автоматическая установка зависимостей**
* **Настройка через GUI**
* **Проверка обновлений**
* Установка обновлений
* Установка из каталога, GitHub или локального источника
* **Hot-reload** без перезапуска бота

<p align="center">
  <img src="./screen/plugin_обзор.png" alt="BlockMine Plugin Marketplace" width="100%">
  <br>
  <em>Встроенный магазин плагинов с категориями, поиском и автоматической установкой зависимостей</em>
</p>

### 🔐 Permissions и Groups

Гибкая система управления доступом.

#### Permissions

* Каждое действие может быть защищено отдельным permission
* Например: `user.fly`
* Права могут создавать плагины
* Права можно создавать и настраивать через панель
* Детальный контроль доступа

#### Groups

* Объединение нескольких permissions
* Предустановленные группы:

  * `Admin`
  * `Member`
* Создание собственных групп

#### Users

* Автоматическое добавление пользователей при взаимодействии с ботом
* Назначение пользователей в группы
* Blacklist пользователей

#### Команды

* **Алиасы**
* **Кулдауны**
* Разрешенные типы чатов
* Временное включение/выключение команд

### 📦 Export / Import

Переносите ботов и их настройки между установками BlockMine.

* Полные резервные копии ботов в **ZIP-архив**
* Экспорт отдельных команд
* Импорт отдельных команд
* Экспорт графов
* Импорт графов
* Перенос конфигурации между установками BlockMine

### 🔌 WebSocket API

BlockMine предоставляет WebSocket API для интеграции с внешними приложениями.

API позволяет:

* Управлять ботами
* Запускать и останавливать ботов
* Выполнять команды
* Вызывать визуальные графы
* Получать результаты выполнения
* Подписываться на события
* Получать события чата
* Получать события игроков
* Получать события здоровья и другие события

Для Node.js существует SDK:

`blockmine-sdk`

> ⚠️ SDK находится в альфа-версии и пока не является приоритетным направлением.

<p align="center">
  <img src="./screen/websocket.png" alt="BlockMine WebSocket API" width="100%">
  <br>
  <em>Интерактивная панель для работы с WebSocket API</em>
</p>

---

# 🤖 MCP Server — управление Minecraft через AI

Одна из ключевых возможностей BlockMine — встроенный **Model Context Protocol (MCP) Server**.

BlockMine предоставляет MCP endpoint:

```text
POST /api/mcp
```

Через MCP AI-агент может работать непосредственно с панелью BlockMine, ботами, серверами, плагинами, файлами, командами, правами, расписанием и визуальным редактором.

Поддерживается подключение через:

* Claude Desktop
* Cursor
* Cline
* Claude Code
* другие MCP-клиенты

## Один AI-диалог — много задач

AI-агент может не просто отправить команду боту, а выполнить полноценный цикл разработки и проверки.

Например:

1. **Читает вывод Minecraft-сервера.**

   * Чат
   * Личные сообщения
   * Клановый чат
   * Консоль бота

2. **Анализирует ответ сервера.**

3. **Создает или изменяет плагин.**

   * Команды
   * Event handlers
   * Настройки
   * Дополнительные функции

4. **Перезагружает плагин** без отключения живого бота от Minecraft-сервера.

5. **Проверяет результат.**

   * Отправляет сообщение в нужный чат
   * Ждет ответ
   * Сравнивает ответ с логом
   * При необходимости исправляет код

6. **Настраивает инфраструктуру.**

   * Permissions
   * Groups
   * Command settings
   * Cron tasks
   * Plugin installation
   * Server settings
   * Proxies

7. **Работает с открытым визуальным графом.**

Таким образом, MCP превращает BlockMine из обычной панели управления ботами в среду, где AI-агент может **создавать, изменять, запускать и проверять Minecraft automation**.

Правки открытого графа видны в редакторе и **не записываются на диск, пока пользователь не сохранит холст**. Руководство по плагинам агент берёт промптом `plugin-author`.

---

# 🔑 Подключение MCP

## 1. Создайте Panel API Key

В панели BlockMine:

**Настройки → API ключи → Создать ключ**

Ключ начинается с:

```text
pk_
```

## 2. Подключите MCP-клиент по HTTP

Например:

```bash
claude mcp add blockmine --scope user --transport http \
  http://localhost:3001/api/mcp \
  --header "Authorization: Bearer pk_ваш_ключ"
```

### Или через `mcp.json`

```json
{
  "mcpServers": {
    "blockmine": {
      "type": "http",
      "url": "http://localhost:3001/api/mcp",
      "headers": {
        "Authorization": "Bearer pk_ваш_ключ"
      }
    }
  }
}
```

## Удаленное подключение

MCP endpoint запускается вместе с BlockMine.

Если панель работает на VPS, вместо:

```text
http://localhost:3001
```

используйте публичный URL вашего сервера.

Авторизация выполняется для каждого запроса через:

```http
Authorization: Bearer pk_*
```

Используются те же ключи, что и для WebSocket API.

---

# 🚀 Быстрый старт

## Требования

Для установки из Git необходимы:

* **Git**
* **Node.js v22+**

На Windows `start.bat` при необходимости может самостоятельно установить Node.js LTS через `winget`.

---

## Windows

### 1. Клонирование

```bash
git clone https://github.com/blockmineJS/blockmine.git
cd blockmine
```

### 2. Запуск через `start.bat`

В корне проекта запустите:

```bat
start.bat
```

Можно просто дважды кликнуть по файлу.

Скрипт автоматически:

1. Проверит наличие Node.js 22+
2. При необходимости установит Node.js LTS через `winget`
3. Установит зависимости через `npm install`
4. Запустит режим разработки через `npm run dev`
5. Запустит backend и Vite
6. Откроет панель

После запуска:

* **Web Panel:** [http://localhost:5173/](http://localhost:5173/)
* **API:** [http://localhost:3001](http://localhost:3001)

Первый запуск может занять несколько минут.

При следующем запуске панель запускается быстрее.

### Переустановка зависимостей

```bat
start.bat reinstall
```

### Ручное обновление

```bat
update.bat
```

Скрипт:

1. Останавливает панель
2. Получает новые коммиты с GitHub
3. Устанавливает зависимости
4. Собирает проект
5. Запускает панель снова

Кнопка **Обновить** в интерфейсе выполняет те же действия.

---

# 🐧 Linux / macOS

Установите зависимости и запустите проект:

```bash
npm install
npm run dev
```

После запуска:

* **Web Panel:** [http://localhost:5173/](http://localhost:5173/)
* **API:** [http://localhost:3001](http://localhost:3001)

---

# 📦 Установка через npm / npx

Если Git установить невозможно:

```bash
npx blockmine
```

Команда:

1. Скачает пакет из npm
2. Настроит базу
3. Запустит сервер

В консоли будет указан адрес:

```text
http://localhost:3001
```

> При установке через `npx` кнопка обновления из панели недоступна. Для получения новой версии нужно повторно запустить `npx blockmine`, поскольку пакет скачивается целиком.

### Windows / PowerShell

Если появляется ошибка:

```text
Невозможно загрузить файл ... npx.ps1,
так как выполнение сценариев отключено
```

откройте PowerShell от имени администратора и выполните:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Нажмите `Y` для подтверждения.

Альтернативный вариант — установить BlockMine из Git и использовать:

```bat
start.bat
```

---

## Установка на хост

Если вы впервые зашли на хост и ничерта не знаете, вводите это. Ubuntu или Debian: команды обновят систему и поставят Node.js 22, npm и PM2.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g npm@latest
sudo npm install -g pm2@latest
```

Потом клонируйте репозиторий:

```bash
git clone https://github.com/blockmineJS/blockmine.git
```

Если написало `-bash: git: command not found`, гита на хосте нет. Поставьте его и снова введите `git clone`:

```bash
sudo apt install -y git
```

Дальше зайдите в папку, соберите панель и запустите:

```bash
cd blockmine
npm i
npm run build
pm2 start
```

Можно зайти по адресу `http://IP-хоста:3001`.

### Обновление

На хосте с PM2 панель сама умеет обновляться: в интерфейсе кнопка **Обновить** делает `git pull`, `npm install`, `npm run build` и `pm2 restart`. Git забирает только новые коммиты, поэтому это быстрее повторной установки пакета. Нужен git-клон на `master`/`main` без локальных правок.

Вручную то же самое:

```bash
cd blockmine
git pull
npm install
npm run build
pm2 restart blockmine
```

Локально через `start.bat` / `npm run dev` сборка не нужна: там Vite на порту 5173.

---

# 🧩 Основные концепции BlockMine

## 🎨 Visual Node Editor

Визуальный редактор — основа No-Code автоматизации BlockMine.

<p align="center">
  <img src="./image/visualcommand.png" alt="BlockMine Visual Node Editor" width="100%">
</p>

Логику можно создавать, перетаскивая и соединяя функциональные блоки — **nodes**.

### Возможности

* Создание команд
* Аргументы команд
* Проверка permissions
* Обработка Minecraft-событий
* Вход игрока
* Сообщения в чате
* Появление мобов
* Условия
* Циклы
* Ветвления
* Live Debug
* Breakpoints
* Trace Viewer
* Совместная работа нескольких пользователей

---

# 🔍 Debugging

BlockMine предоставляет две системы отладки:

* **Live Debug**
* **Trace Viewer**

## Live Debug

Позволяет отлаживать визуальный граф непосредственно во время его выполнения.

### Возможности

* **Breakpoints** — остановка на конкретной ноде
* **Conditional Breakpoints** — остановка при выполнении условия
* **Step Over** — пошаговое выполнение
* **What-If** — изменение значений во время паузы
* **Multi-user synchronization** — все пользователи видят одинаковое состояние отладки

<p align="center">
  <strong>🎨 Визуальный редактор с Live Debug</strong><br>
  <img src="./screen/graph_live_debug.png" alt="BlockMine Live Debug" width="100%">
  <br>
  <em>Отладка графов в реальном времени с брейкпоинтами и пошаговым выполнением</em>
</p>

## Trace Viewer

Trace Viewer сохраняет историю выполнения графов.

Возможности:

* **Execution History** — история всех запусков графа
* **Variable Values** — значения входов и выходов каждой ноды
* **Replay** — пошаговый просмотр выполнения
* **Timeline** — визуализация порядка выполнения нод

<p align="center">
  <strong>🔍 Trace Viewer</strong><br>
  <img src="./screen/node_debug_trace.png" alt="BlockMine Trace Viewer" width="100%">
  <br>
  <em>Пошаговая визуализация выполнения графа с историей и значениями переменных</em>
</p>

---

# 🔌 Plugins

Плагины являются основным способом программного расширения BlockMine.

<p align="center">
  <img src="./screen/plugin_обзор.png" alt="BlockMine Plugin Store" width="100%">
  <br>
  <em>Встроенный магазин плагинов с категориями, поиском и автоматической установкой зависимостей</em>
</p>

Плагины могут:

* Добавлять команды
* Создавать новые визуальные nodes
* Работать в фоне
* Интегрироваться с внешними сервисами
* Расширять возможности Minecraft-ботов

## Plugin Store

Каталог поддерживает:

* Категории
* Фильтрацию по назначению
* Поиск
* Автоматическую установку зависимостей
* Настройку через GUI
* Проверку обновлений
* Установку обновлений

Примеры категорий:

* Ядро
* Клан
* Утилиты

---

# ⚙️ Commands

Команды BlockMine можно создавать двумя способами:

1. Программно через плагины
2. Визуально через Node Editor

## Программные команды

Пример команды через плагин:

```javascript
bot.registerCommand({
  name: 'ping',
  description: 'Проверка связи',
  execute: async (context) => {
    return `Понг, ${context.user.username}!`;
  }
});
```

## Визуальные команды

Визуальный редактор позволяет создавать команды без программирования.

Поддерживаются:

* **Drag-and-Drop**
* Аргументы
* Типы аргументов
* Значения по умолчанию
* Условия
* Проверка permissions
* Проверка времени суток
* Циклы
* Ветвления

## Централизованное управление командами

Для команд доступны:

* **Aliases** — например `@p` для `@ping`
* **Cooldowns**
* Разрешенные типы чатов:

  * `chat`
  * `local`
  * `clan`
  * `private`

  Плагин может добавить свой тип. В него приходят новые строки сообщений с сервера, и бот может отправлять в него. Команду тогда можно разрешить именно в этом типе.
* Включение и выключение команд

---

# 🔐 Permissions & Groups

BlockMine предоставляет встроенную систему permissions и groups.

## Permissions

Каждое действие может быть защищено отдельным permission:

```text
user.fly
```

Permissions могут:

* Создаваться плагинами
* Создаваться через панель
* Назначаться группам
* Использоваться для детального контроля доступа

## Groups

Группы объединяют несколько permissions.

Предустановленные группы:

```text
Admin
Member
```

Можно создавать собственные группы.

## Users

Пользователи:

* Автоматически добавляются при взаимодействии с ботом
* Могут назначаться в группы
* Могут добавляться в blacklist

---

# ⏰ Task Scheduler

BlockMine позволяет автоматически запускать действия по расписанию.

Поддерживаются **Cron expressions**.

Можно настроить:

* Запуск бота
* Перезапуск бота
* Выполнение команд
* Другие доступные действия

Для задач доступны:

* Cron-расписания
* История запусков
* Включение / выключение задач
* Временная деактивация

---

# 🧑‍💻 Для разработчиков

BlockMine можно использовать не только как No-Code инструмент, но и как платформу для разработки собственных Minecraft automation plugins.

> **🤖 Для AI-агентов:** если вы подключены через MCP, используйте prompt `plugin-author` через `prompts/get`. Если MCP недоступен, полная документация находится в [docs/plugin-author.md](./docs/plugin-author.md).

## Требования

* **Node.js v22+**
* **npm** или **yarn**

## Установка

```bash
git clone https://github.com/blockmineJS/blockmine.git
cd blockmine
npm install
npm run build
```

На Windows можно использовать:

```bat
start.bat
```

Скрипт устанавливает зависимости и запускает режим разработки.

## Development Mode

```bash
npm run dev
```

Команда одновременно запускает:

* Backend через `nodemon`
* Frontend через `Vite`
* Hot reload

После запуска:

* **Backend:** [http://localhost:3001](http://localhost:3001)
* **Frontend:** [http://localhost:5173](http://localhost:5173)

---

# 🖼️ Скриншоты

## Dashboard

<p align="center">
  <img src="./screen/dashboard.png" alt="BlockMine Dashboard" width="100%">
  <br>
  <em>Статус ботов, CPU и RAM</em>
</p>

## Plugin Store

<p align="center">
  <img src="./screen/plugins-store.png" alt="BlockMine Plugin Store" width="100%">
  <br>
  <em>Установка из каталога, GitHub или локально</em>
</p>

## Installed Plugins

<p align="center">
  <img src="./screen/plugins.png" alt="BlockMine Installed Plugins" width="100%">
  <br>
  <em>Включение, настройки и команды плагина</em>
</p>

## Plugin Editor

<p align="center">
  <img src="./screen/ide.png" alt="BlockMine Plugin Editor" width="100%">
  <br>
  <em>Файлы, Monaco и терминал на машине, где запущена панель</em>
</p>

## Commands

<p align="center">
  <img src="./screen/management.png" alt="BlockMine Commands" width="100%">
  <br>
  <em>Алиасы, права и источник команды</em>
</p>

## 3D Viewer

<p align="center">
  <img src="./screen/3dviewer.png" alt="BlockMine 3D Viewer" width="100%">
  <br>
  <em>Мир Minecraft глазами бота</em>
</p>

## Graph Debugging

<p align="center">
  <img src="./screen/graph_live_debug.png" alt="BlockMine Graph Debugger" width="100%">
  <br>
  <em>Брейкпоинты и значения нод</em>
</p>

---

# 🤝 Вклад в проект

Мы приветствуем вклад в развитие BlockMine.

## Как внести изменения

1. Сделайте **Fork** репозитория
2. Создайте ветку для новой функции:

```bash
git checkout -b feature/amazing-feature
```

3. Сделайте commit:

```bash
git commit -m "feat: добавлена потрясающая фича"
```

4. Отправьте ветку:

```bash
git push origin feature/amazing-feature
```

5. Откройте **Pull Request**

## Commit Style

Мы используем [Conventional Commits](https://www.conventionalcommits.org/).

Поддерживаемые основные типы:

* `feat:` — новая функциональность
* `fix:` — исправление бага
* `docs:` — изменения документации
* `chore:` — рутинные изменения, например обновление зависимостей

---

# ⭐ BlockMine

**BlockMine — это open-source Minecraft bot framework и automation platform для создания, запуска, отладки и управления Minecraft-ботами.**

Если вы ищете:

* Minecraft bot framework
* Minecraft bot manager
* Minecraft automation framework
* Mineflayer-based bot platform
* Minecraft scripting platform
* No-Code Minecraft bot builder
* Minecraft multi-bot manager
* Minecraft bot API
* Minecraft plugin system
* AI Minecraft bot platform
* MCP Minecraft automation

— BlockMine объединяет эти возможности в одной платформе.

<div align="center">
  <p>
    <a href="https://github.com/blockmineJS/blockmine">⭐ Поставьте звезду на GitHub</a>
  </p>
</div>

---

## Keywords

```text
Minecraft bot
Minecraft bot framework
Minecraft automation
Minecraft automation framework
Minecraft bot manager
Minecraft bot platform
Minecraft bot API
Minecraft bot library
Minecraft scripting
Minecraft automation tool
Minecraft plugin system
Minecraft multi-bot
Minecraft AI bot
AI Minecraft bot
Minecraft MCP
Minecraft MCP server
Minecraft bot dashboard
Minecraft bot manager
Minecraft no-code
Minecraft visual scripting
Minecraft visual node editor
Mineflayer
Mineflayer bot
Mineflayer framework
Minecraft JavaScript bot
Minecraft Node.js bot
Minecraft server automation
Minecraft server bot
Minecraft clan bot
Minecraft AFK bot
Minecraft monitoring bot
Minecraft farming bot
Minecraft economy bot
Minecraft Discord bot
Minecraft Telegram bot
```
