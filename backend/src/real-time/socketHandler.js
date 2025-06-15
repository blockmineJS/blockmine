const { Server } = require('socket.io');

let io;

function initializeSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: "http://localhost:5173",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('A user connected to Socket.IO');
        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });
    
    console.log('Socket.IO initialized');
    return io;
}

function getIO() {
    if (!io) {
        throw new Error("Socket.IO not initialized!");
    }
    return io;
}

module.exports = { initializeSocket, getIO };