const { Server } = require('socket.io');
const config = require('../config');

let io;

function initializeSocket(httpServer) {
    const corsOptions = {
        methods: ["GET", "POST"]
    };

    if (config.server.allowExternalAccess) {
        corsOptions.origin = "*";
    } else {
        corsOptions.origin = "http://localhost:5173";
    }

    io = new Server(httpServer, {
        path: "/socket.io/",
        cors: corsOptions
    });

    io.on('connection', (socket) => {
        console.log('Socket.IO: Пользователь подключен -', socket.id);
        socket.on('disconnect', () => {
            console.log('Socket.IO: Пользователь отключен -', socket.id);
        });
    });
    
    console.log('Socket.IO инициализирован с CORS для:', corsOptions.origin);
    return io;
}

function getIO() {
    if (!io) {
        throw new Error("Socket.IO not initialized!");
    }
    return io;
}

module.exports = { initializeSocket, getIO };