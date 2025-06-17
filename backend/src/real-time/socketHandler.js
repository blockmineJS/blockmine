const { Server } = require('socket.io');

let io;

function initializeSocket(httpServer) {
    const allowedOrigins = [
        "http://localhost:5173",
        "https://diversely-memorable-weasel.cloudpub.ru"
    ];

    io = new Server(httpServer, {
        cors: {
            origin: function (origin, callback) {
                if (!origin) return callback(null, true);
                if (allowedOrigins.indexOf(origin) === -1) {
                    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
                    return callback(new Error(msg), false);
                }
                return callback(null, true);
            },
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