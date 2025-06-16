const { Server } = require('socket.io');

let io;

function initializeSocket(httpServer) {
    const origin = process.env.CLIENT_ORIGIN || '*';
    io = new Server(httpServer, {
        cors: {
            origin,
            methods: ["GET", "POST"],
            credentials: true
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