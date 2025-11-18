class MessageQueue {
    constructor(bot) {
        this.bot = bot;
        this.queue = [];
        this.isProcessing = false;

        this.lastGlobalSendTime = 0;
        this.minGlobalDelay = 350; 

        this.lastSendTimes = {};
        this.chatTypes = {
            command: { prefix: '', delay: 400 },
            chat: { prefix: '', delay: 1000 },
            private: { prefix: '/msg ', delay: 1000 },
        };
        Object.keys(this.chatTypes).forEach(type => {
            this.lastSendTimes[type] = 0;
        });
    }

    registerChatType(typeName, config) {
        this.chatTypes[typeName] = config;
        this.lastSendTimes[typeName] = 0;
    }

    _unescapeString(str) {
        const ESCAPE_MARKER = '\uE000';
        return str
            .replace(/\\\\/g, ESCAPE_MARKER)
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\'/g, "'")
            .replace(/\\"/g, '"')
            .replace(new RegExp(ESCAPE_MARKER, 'g'), '\\');
    }

    _enqueue(task) {
        this.queue.push(task);
        if (!this.isProcessing) {
            this._processNext();
        }
    }


    enqueue(chatType, message, username = null) {
        const typeConfig = this.chatTypes[chatType];
        if (!typeConfig) return;

        let messagesToQueue = [];

        if (Array.isArray(message)) {
            messagesToQueue = message;
        } else if (typeof message === 'string') {
            const unescapedMessage = this._unescapeString(message);
            const normalizedMessage = unescapedMessage.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            messagesToQueue = normalizedMessage.split('\n');
        }

        for (const msg of messagesToQueue) {
            const trimmedMsg = msg.trim();
            if (trimmedMsg.length > 0) {
                this._enqueue({ type: 'simple', chatType, ...typeConfig, message: trimmedMsg, username });
            }
        }
    }


    enqueueAndWait(command, patterns, timeout) {
        return new Promise((resolve, reject) => {
            const typeConfig = this.chatTypes['command'];
            this._enqueue({
                type: 'waitable', chatType: 'command', ...typeConfig,
                message: command, patterns, timeout, resolve, reject,
            });
        });
    }

    async _processNext() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;
        const task = this.queue.shift();

        try {
            const now = Date.now();

            const timeSinceGlobal = now - this.lastGlobalSendTime;
            const globalDelayNeeded = this.minGlobalDelay - timeSinceGlobal;

            const lastSent = this.lastSendTimes[task.chatType] || 0;
            const timeSinceType = now - lastSent;
            const typeDelayNeeded = (task.delay || 0) - timeSinceType;

            const finalDelay = Math.max(globalDelayNeeded, typeDelayNeeded);

            if (finalDelay > 0) {
                await new Promise(resolve => setTimeout(resolve, finalDelay));
            }

            const sendTime = Date.now();
            this.lastGlobalSendTime = sendTime;
            this.lastSendTimes[task.chatType] = sendTime;

            if (task.type === 'waitable') {
                await this._handleWaitableTask(task);
            } else {
                let fullMessage;
                const typeConfig = this.chatTypes[task.chatType];

                // Для private/whisper добавляем username
                if ((task.chatType === 'private' || task.chatType === 'whisper') && task.username) {
                    fullMessage = `/msg ${task.username} ${task.message}`;
                }
                // Для остальных типов используем prefix из конфига
                else if (typeConfig && typeConfig.prefix) {
                    fullMessage = `${typeConfig.prefix}${task.message}`;
                }
                // Если нет prefix (command, chat) - отправляем как есть
                else {
                    fullMessage = task.message;
                }

                this.bot.chat(fullMessage);
            }
        } catch (error) {
            if (task.type === 'waitable' && task.reject) task.reject(error);
        } finally {
            this._processNext();
        }
    }

    _handleWaitableTask(task) {
        return new Promise((resolve, reject) => {
            let timeoutId;
            const listener = (rawMessageText) => {
                for (const pattern of task.patterns) {
                    const match = rawMessageText.match(pattern);
                    if (match) {
                        this.bot.events.removeListener('core:raw_message', listener);
                        clearTimeout(timeoutId);
                        task.resolve(match);
                        resolve();
                        return;
                    }
                }
            };
            this.bot.events.on('core:raw_message', listener);
            this.bot.chat(task.message);
            timeoutId = setTimeout(() => {
                this.bot.events.removeListener('core:raw_message', listener);
                task.reject(new Error(`Timeout`));
                resolve();
            }, task.timeout);
        });
    }
}

module.exports = MessageQueue;