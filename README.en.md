[🇷🇺 Русский](./README.md) | **🇬🇧 English**

---

<div align="center">
  <img src="./image/logo.png" alt="BlockMine Logo" width="150">
  <h1>BlockMine</h1>
  <p>
    <strong>Powerful Minecraft bot management platform with visual programming and advanced debugging</strong>
  </p>
  <p>
    <a href="https://github.com/blockmineJS/blockmine/stargazers"><img src="https://img.shields.io/github/stars/blockmineJS/blockmine?style=for-the-badge&logo=github" alt="Stars"></a>
    <a href="https://github.com/blockmineJS/blockmine/commits/main"><img src="https://img.shields.io/github/last-commit/blockmineJS/blockmine?style=for-the-badge&logo=git" alt="Last Commit"></a>
    <a href="http://185.65.200.184:3000/api/stats" target="_blank">
      <img src="https://img.shields.io/endpoint?url=https://blockmine-proxy.vercel.app/api/shield&style=for-the-badge&logo=minecraft&logoColor=white" alt="Bots Online">
    </a>
  </p>
</div>

**BlockMine** is an open-source solution for centralized management and automation of Minecraft bots. Launch bots, manage them in real-time, extend their capabilities with plugins, and create complex behavior scenarios in a visual editor.

More examples at - https://t.me/blockmineJs

---

## 🚀 Key Features

### 💻 Modern Web Interface
- **Responsive dashboard** built with React and Tailwind CSS for any device
- **Dark theme** with modern design
- **Real-time updates** via WebSocket
- **Multi-language** — Russian and English support

<p align="center">
  <img src="./screen/language_selector.png" alt="Language Selection" width="400">
  <br>
  <em>Interface language selection on first launch</em>
</p>

### ✨ Visual Logic Editor (No-Code)
- **Drag-and-Drop interface** for creating complex logic without code
- **Live Debug mode** with breakpoints and step-by-step execution
- **Execution tracing** with history and variable values
- **Collaborative editing** of graphs by multiple users
- **AI Assistant** for help with logic creation

### 🤖 Comprehensive Bot Management
- **Start/stop/restart** with one click
- **Interactive console** for each bot with history
- **Resource monitoring** (CPU/RAM) in real-time
- **3D Viewer** — see the world through bot's eyes in real-time
- **SOCKS5 proxy support** individually for each bot
- **Task scheduler** with cron schedules

<p align="center">
  <img src="./screen/3dviewer.png" alt="3D Viewer" width="100%">
  <br>
  <em>Real-time 3D view of Minecraft world through bot's eyes</em>
</p>

### 🔌 Powerful Plugin System
- **Built-in store** with categories and search
- **Automatic dependency installation**
- **GUI configuration** without editing config files
- **Hot-reload** plugins without restarting the bot

### 🔐 Flexible Permission System
- **User groups** (Admin, Member, etc.)
- **Detailed access rights** for each command
- **User blacklist**
- **Cooldowns** and **aliases** for commands

### 🔄 Export and Import
- **Full bot backups** to ZIP archive
- **Export/import** individual commands and graphs
- **Transfer between BlockMine installations**

### 🔌 WebSocket API
- **Bot control** from external applications
- **Command execution** with full permission checking
- **Call visual graphs** and get results
- **Subscribe to events** (chat, players, health, etc.)
- **SDK** `blockmine-sdk` for Node.js ⚠️ *(alpha version, not a priority)*

<p align="center">
  <img src="./screen/websocket.png" alt="WebSocket API" width="100%">
  <br>
  <em>Interactive panel for working with WebSocket API</em>
</p>

---

## ✨ Quick Start with `npx`

This is the easiest way to run the panel locally. Make sure you have **Node.js v22+** installed.

1. Open terminal (command prompt)
2. Run a single command:

```bash
npx blockmine
```

3. Done! The script will automatically download everything needed, set up the database, and start the server.

> ⚠️ **For Windows users**: If you get an error `Cannot load file ... npx.ps1 because running scripts is disabled`, open PowerShell as administrator and run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`. Press 'Y' to confirm.

After successful startup, you'll see in the console:
```
Control panel available at: http://localhost:3001
```
Open this address in your browser to get started.

---

## 🚀 Hosting Installation (VPS/Dedicated Server)

For production deployment on a server, it's recommended to use PM2 for process management.

### Requirements
- **Node.js v22+**
- **npm**
- **Git** (for cloning the repository)
- **PM2** (process manager)

### Step 1: Clone the Repository

```bash
git clone https://github.com/blockmineJS/blockmine.git
cd blockmine
```

### Step 2: Install Dependencies

```bash
npm install
```

> **Note**: The `npm install` command will automatically run the `postinstall` script, which installs frontend dependencies and generates the Prisma client.

### Step 3: Build Frontend

```bash
npm run build
```

This command will create an optimized production build of the React application.

### Step 4: Install PM2

If PM2 is not yet installed globally:

```bash
npm install -g pm2
```

### Step 5: Start with PM2

Launch the application using the ready-made configuration file:

```bash
pm2 start ecosystem.config.js
```

> **Note**: The project already includes an `ecosystem.config.js` file with optimal production settings.

### Updating

To update to the latest version: ON HOST! For local you can skip build since it uses port 5173

```bash
cd blockmine
git pull
npm install
npm run build
pm2 restart blockmine
```

---

## 💡 Core BlockMine Concepts

### 🎨 Visual Editor

<p align="center">
  <img src="./image/visualcommand.png" alt="Visual Editor" width="100%">
</p>

The heart of No-Code automation in BlockMine. The editor allows you to create logic by dragging and connecting functional blocks (nodes).

#### Editor Features:
- **Create commands** with arguments, permission checks, and complex logic
- **Handle events** (player join, chat messages, mob spawns)
- **Live Debug** - real-time debugging with breakpoints
- **Trace Viewer** - view execution history with variable values
- **Collaborative work** - multiple developers can edit simultaneously
- **AI assistant** - help with logic creation

### 🔍 Debugging System

BlockMine provides two powerful debugging systems:

#### Live Debug
- **Breakpoints** - stop execution at specific nodes
- **Conditional breakpoints** - trigger when condition is met
- **Step-by-step execution** - Step Over for detailed analysis
- **What-If mode** - modify values during pause
- **Multi-user synchronization** - everyone sees the same debug state
<td align="center">
      <p><strong>🎨 Visual Editor with Live Debug</strong></p>
      <img src="./screen/graph_live_debug.png" alt="Live Debug" width="100%">
      <em>Real-time graph debugging with breakpoints and step-by-step execution</em>
    </td>

#### Trace Viewer
- **Execution history** - saving all graph runs
- **Variable values** - view inputs/outputs of each node
- **Playback** - step-by-step execution review
- **Timeline** - visualization of node execution order
<tr>
    <td align="center">
      <p><strong>🔍 Execution Tracing</strong></p>
      <img src="./screen/node_debug_trace.png" alt="Trace Debug" width="100%">
      <em>Step-by-step graph execution visualization with history and variable values</em>
    </td>
  </tr>


### 🔌 Plugins

<p align="center">
  <img src="./screen/plugin_обзор.png" alt="Plugin Store" width="100%">
  <br>
  <em>Built-in plugin store with categories, search, and automatic dependency installation</em>
</p>

Plugins are a way to programmatically extend functionality. They can:
- Add new commands
- Create new nodes for the visual editor
- Work in background mode
- Integrate with external services

#### Plugin Store Features
- **Categories** - filter by purpose (Core, Clan, Utilities, etc.)
- **Automatic installation** - dependencies are installed automatically
- **GUI configuration** - without editing config files
- **Updates** - check and install updates

### ⚙️ Commands

Commands can be created in two ways:

#### Programmatic Commands (via plugins)
```javascript
bot.registerCommand({
  name: 'ping',
  description: 'Connection check',
  execute: async (context) => {
    return `Pong, ${context.user.username}!`;
  }
});
```

#### Visual Commands (via editor)
- **Drag-and-Drop** logic creation
- **Arguments** - define types and default values
- **Conditions** - check permissions, time of day, etc.
- **Loops and branching** - complex logic without code

#### Centralized Management
- **Aliases** - short aliases (e.g., `@p` for `@ping`)
- **Cooldowns** - delay between uses
- **Allowed chats** - chat, local, clan, private
- **Enable/disable** - temporarily disable commands

### 🔐 Permissions and Groups

Flexible access control system:

#### Permissions
- Each action is protected by a permission (e.g., `user.fly`)
- Permissions are created by plugins or in the control panel
- Detailed access control

#### Groups
- Combining multiple permissions
- Preset groups: Admin, Member
- Create custom groups

#### Users
- Automatically added when interacting with the bot
- Assign to groups
- Blacklist for blocking

### ⏰ Task Scheduler

Automate bot actions on schedule:
- **Cron expressions** - flexible time configuration
- **Actions** - start/restart bot, execute commands
- **Run history** - view recent executions
- **Enable/disable** - temporarily deactivate tasks

---

## 🧑‍💻 For Developers and Contributors

If you want to contribute to the project or run it in development mode.

### Requirements
- **Node.js v22+**
- **npm** or **yarn**

### 1. Installation

```bash
git clone https://github.com/blockmineJS/blockmine.git
cd blockmine
npm install
npm run build
```

### 2. Running in Development Mode

This command will simultaneously start the backend (`nodemon`) and frontend (`vite`) with hot reloading.

```bash
npm run dev
```

- **Backend** will be available at `http://localhost:3001`
- **Frontend** with hot reloading will be available at `http://localhost:5173`


## 📸 Screenshots

<table align="center">
  <tr>
    <td align="center">
      <p><strong>📊 Dashboard</strong></p>
      <img src="./screen/dashboard.png" alt="Dashboard" width="100%">
      <em>Resource monitoring and managing all bots in real-time</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <p><strong>🌍 3D Viewer</strong></p>
      <img src="./screen/3dviewer.png" alt="3D Viewer" width="100%">
      <em>Real-time Minecraft world view through bot's eyes</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <p><strong>🔌 WebSocket API</strong></p>
      <img src="./screen/websocket.png" alt="WebSocket" width="100%">
      <em>Interactive panel for working with WebSocket API</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <p><strong>👥 Collaborative Graph Editing</strong></p>
      <img src="./screen/graph_collabe.png" alt="Collaboration" width="100%">
      <em>Multiple developers can work on the same graph simultaneously</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <p><strong>💻 Interactive Console</strong></p>
      <img src="./screen/console.png" alt="Console" width="100%">
      <em>Full-featured bot console with color highlighting and command history</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <p><strong>⚙️ Command Management</strong></p>
      <img src="./screen/management_command.png" alt="Command Management" width="100%">
      <em>Centralized command management with aliases and access rights</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <p><strong>🎛️ Command Settings</strong></p>
      <img src="./screen/настройки_отдельных_команд_кажду_команлду_можно_настраивать.png" alt="Command Settings" width="100%">
      <em>Flexible configuration for each command: aliases, cooldowns, permissions, and allowed chats</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <p><strong>⏰ Task Scheduler</strong></p>
      <img src="./screen/планировщик_можно_задавать_действия_по_времени.png" alt="Scheduler" width="100%">
      <em>Automate bot actions with cron schedules</em>
    </td>
  </tr>
</table>

---

---

## 🤝 Contributing

We welcome your contributions! Here's how you can help:

1. **Fork** the repository
2. Create a branch for your feature (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a **Pull Request**

### Commit Style

We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - new functionality
- `fix:` - bug fix
- `docs:` - documentation changes
- `chore:` - routine tasks (updating dependencies, etc.)

---

---

<div align="center">
  <p>
    <a href="https://github.com/blockmineJS/blockmine">⭐ Star us on GitHub</a>
  </p>
</div>
