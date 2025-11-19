import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useAppStore } from '@/stores/appStore';

export default function Terminal({ botId }) {
    const terminalRef = useRef(null);
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);
    const initTimeoutRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const socket = useAppStore(state => state.socket);

    useEffect(() => {
        // Clear any pending initialization
        if (initTimeoutRef.current) {
            clearTimeout(initTimeoutRef.current);
        }

        if (!terminalRef.current) return;

        const container = terminalRef.current;

        // Wait for container to be visible and have dimensions
        const waitForContainer = () => {
            return new Promise((resolve) => {
                const check = () => {
                    if (!container) {
                        resolve(false);
                        return;
                    }

                    const rect = container.getBoundingClientRect();
                    const { clientWidth, clientHeight } = container;

                    // Check if container is visible and has dimensions
                    if (clientWidth > 0 && clientHeight > 0 && rect.width > 0 && rect.height > 0) {
                        resolve(true);
                    } else {
                        requestAnimationFrame(check);
                    }
                };

                // Start checking after a small delay
                initTimeoutRef.current = setTimeout(check, 100);
            });
        };

        const initTerminal = async () => {
            const isContainerReady = await waitForContainer();

            if (!isContainerReady || !container) {
                console.warn('Terminal container not ready');
                return;
            }

            try {
                const term = new XTerm({
                    theme: {
                        background: '#1e1e1e',
                        foreground: '#d4d4d4',
                        cursor: '#d4d4d4',
                        selectionBackground: '#3a3d41',
                        black: '#000000',
                        red: '#cd3131',
                        green: '#0dbc79',
                        yellow: '#e5e510',
                        blue: '#2472c8',
                        magenta: '#bc3fbc',
                        cyan: '#11a8cd',
                        white: '#e5e5e5',
                        brightBlack: '#666666',
                        brightRed: '#f14c4c',
                        brightGreen: '#23d18b',
                        brightYellow: '#f5f543',
                        brightBlue: '#3b8eea',
                        brightMagenta: '#d670d6',
                        brightCyan: '#29b8db',
                        brightWhite: '#e5e5e5',
                    },
                    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                    fontSize: 14,
                    cursorBlink: true,
                    convertEol: true,
                    rows: 24,
                    cols: 80,
                });

                const fitAddon = new FitAddon();
                term.loadAddon(fitAddon);

                // Open terminal
                term.open(container);

                // Store refs immediately after opening
                xtermRef.current = term;
                fitAddonRef.current = fitAddon;

                // Fit terminal after a delay to ensure rendering is complete
                setTimeout(() => {
                    try {
                        if (fitAddonRef.current && container.clientWidth > 0) {
                            fitAddon.fit();
                        }
                    } catch (e) {
                        console.warn('Initial fit error:', e);
                    }
                }, 100);

                term.writeln('\x1b[1;32mКонсоль Бота\x1b[0m');
                term.writeln(`Подключено к сессии: ${botId}`);

                // Handle input
                let currentLine = '';
                term.onData(data => {
                    if (data === '\r') {
                        term.write('\r\n');
                        if (currentLine.trim()) {
                            if (socket) {
                                socket.emit('bot:chat', { botId, message: currentLine });
                            } else {
                                term.writeln('\x1b[31mОшибка: Нет соединения с сервером\x1b[0m');
                            }
                        }
                        currentLine = '';
                        term.write('> ');
                    } else if (data === '\u007F') {
                        if (currentLine.length > 0) {
                            currentLine = currentLine.slice(0, -1);
                            term.write('\b \b');
                        }
                    } else {
                        currentLine += data;
                        term.write(data);
                    }
                });

                term.write('> ');
                setIsReady(true);
            } catch (error) {
                console.error('Failed to initialize terminal:', error);
            }
        };

        initTerminal();

        return () => {
            if (initTimeoutRef.current) {
                clearTimeout(initTimeoutRef.current);
            }
            if (xtermRef.current) {
                try {
                    xtermRef.current.dispose();
                } catch (e) {
                    console.warn('Error disposing terminal:', e);
                }
                xtermRef.current = null;
                fitAddonRef.current = null;
            }
            setIsReady(false);
        };
    }, [botId]);

    // Socket event listeners
    useEffect(() => {
        if (!socket || !xtermRef.current || !isReady) return;

        const handleLog = (data) => {
            if (!xtermRef.current) return;

            if (data.botId === parseInt(botId) && data.log) {
                const content = typeof data.log === 'string'
                    ? data.log
                    : (data.log.content || JSON.stringify(data.log));

                xtermRef.current.writeln(content);
                xtermRef.current.write('> ');
            }
        };

        socket.emit('bot:logs:subscribe', botId);
        socket.on('bot:log', handleLog);

        return () => {
            socket.off('bot:log', handleLog);
            socket.emit('bot:logs:unsubscribe', botId);
        };
    }, [socket, botId, isReady]);

    // Re-fit when container size changes
    useEffect(() => {
        if (!isReady || !fitAddonRef.current || !terminalRef.current) return;

        const observer = new ResizeObserver(() => {
            if (fitAddonRef.current && terminalRef.current) {
                const { clientWidth, clientHeight } = terminalRef.current;
                if (clientWidth > 0 && clientHeight > 0) {
                    requestAnimationFrame(() => {
                        try {
                            fitAddonRef.current?.fit();
                        } catch (e) {
                            // Silently ignore fit errors during resize
                        }
                    });
                }
            }
        });

        observer.observe(terminalRef.current);
        return () => observer.disconnect();
    }, [isReady]);

    return <div ref={terminalRef} className="h-full w-full bg-[#1e1e1e] p-2" />;
}
