const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const os = require('os');

const debugOnly = (req, res, next) => {
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
        next();
    } else {
        res.status(403).json({
            success: false,
            error: 'Доступ к логам разрешен только в режиме отладки'
        });
    }
};

let logBuffer = [];
const MAX_LOG_BUFFER = 1000;

const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

function addToLogBuffer(level, ...args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    const logEntry = {
        timestamp,
        level,
        message,
        pid: process.pid
    };
    
    logBuffer.push(logEntry);
    
    if (logBuffer.length > MAX_LOG_BUFFER) {
        logBuffer = logBuffer.slice(-MAX_LOG_BUFFER);
    }
}

console.log = (...args) => {
    addToLogBuffer('log', ...args);
    originalConsoleLog.apply(console, args);
};

console.error = (...args) => {
    addToLogBuffer('error', ...args);
    originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
    addToLogBuffer('warn', ...args);
    originalConsoleWarn.apply(console, args);
};

console.info = (...args) => {
    addToLogBuffer('info', ...args);
    originalConsoleInfo.apply(console, args);
};

router.get('/', debugOnly, (req, res) => {
    try {
        const { 
            level, 
            limit = 100, 
            offset = 0, 
            search,
            from,
            to 
        } = req.query;
        
        let filteredLogs = [...logBuffer];
        
        if (level && level !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.level === level);
        }
        
        if (search) {
            const searchLower = search.toLowerCase();
            filteredLogs = filteredLogs.filter(log => 
                log.message.toLowerCase().includes(searchLower)
            );
        }
        
        if (from) {
            const fromDate = new Date(from);
            filteredLogs = filteredLogs.filter(log => 
                new Date(log.timestamp) >= fromDate
            );
        }
        
        if (to) {
            const toDate = new Date(to);
            filteredLogs = filteredLogs.filter(log => 
                new Date(log.timestamp) <= toDate
            );
        }
        
        const total = filteredLogs.length;
        const logs = filteredLogs
            .slice(parseInt(offset), parseInt(offset) + parseInt(limit))
            .reverse();
        
        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: parseInt(offset) + parseInt(limit) < total
                }
            }
        });
        
    } catch (error) {
        console.error('Ошибка при получении логов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении логов'
        });
    }
});

router.delete('/', debugOnly, (req, res) => {
    try {
        logBuffer = [];
        res.json({
            success: true,
            message: 'Логи очищены'
        });
    } catch (error) {
        console.error('Ошибка при очистке логов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при очистке логов'
        });
    }
});

router.get('/stats', debugOnly, (req, res) => {
    try {
        const stats = {
            total: logBuffer.length,
            byLevel: {
                log: logBuffer.filter(log => log.level === 'log').length,
                error: logBuffer.filter(log => log.level === 'error').length,
                warn: logBuffer.filter(log => log.level === 'warn').length,
                info: logBuffer.filter(log => log.level === 'info').length
            },
            timeRange: {
                oldest: logBuffer.length > 0 ? logBuffer[0].timestamp : null,
                newest: logBuffer.length > 0 ? logBuffer[logBuffer.length - 1].timestamp : null
            }
        };
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('Ошибка при получении статистики логов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении статистики логов'
        });
    }
});

router.get('/stream', debugOnly, (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    const sendLog = (log) => {
        res.write(`data: ${JSON.stringify(log)}\n\n`);
    };
    
    const recentLogs = logBuffer.slice(-10);
    recentLogs.forEach(sendLog);
    
    const logHandler = (log) => {
        sendLog(log);
    };
    
    if (!global.logStreamHandlers) {
        global.logStreamHandlers = [];
    }
    global.logStreamHandlers.push(logHandler);
    
    req.on('close', () => {
        const index = global.logStreamHandlers.indexOf(logHandler);
        if (index > -1) {
            global.logStreamHandlers.splice(index, 1);
        }
    });
});

function broadcastLog(log) {
    if (global.logStreamHandlers) {
        global.logStreamHandlers.forEach(handler => {
            try {
                handler(log);
            } catch (error) {
                console.error('Ошибка при отправке лога клиенту:', error);
            }
        });
    }
}

const originalAddToLogBuffer = addToLogBuffer;
addToLogBuffer = function(level, ...args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    const logEntry = {
        timestamp,
        level,
        message,
        pid: process.pid
    };
    
    logBuffer.push(logEntry);
    
    if (logBuffer.length > MAX_LOG_BUFFER) {
        logBuffer = logBuffer.slice(-MAX_LOG_BUFFER);
    }
    
    broadcastLog(logEntry);
};

module.exports = router; 