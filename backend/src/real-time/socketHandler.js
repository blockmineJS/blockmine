const { Server } = require('socket.io');
const config = require('../config');

let io;

function initializeSocket(httpServer) {
    const corsOptions = {
        origin: true,
        methods: ["GET", "POST"],
        credentials: true
    };

    io = new Server(httpServer, {
        cors: corsOptions,
        transports: ['websocket', 'polling']
    });

    io.on('connection', (socket) => {
        // console.log(`[Socket.IO] Пользователь подключен: ${socket.id}. Всего клиентов: ${io.engine.clientsCount}`);
        
        socket.on('disconnect', () => {
            // console.log(`[Socket.IO] Пользователь отключен: ${socket.id}. Всего клиентов: ${io.engine.clientsCount}`);
        });
    });
    
    // console.log('Socket.IO инициализирован с динамическим CORS.');
    return io;
}

function getIO() {
    if (!io) {
        throw new Error("Socket.IO not initialized!");
    }
    return io;
}

module.exports = { initializeSocket, getIO };