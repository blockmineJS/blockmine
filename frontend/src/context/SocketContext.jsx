import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAppStore } from '@/stores/appStore';

const SocketContext = createContext(null);

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const token = useAppStore(state => state.token);

    useEffect(() => {
        if (!token) return;

        const newSocket = io('/', {
            auth: {
                token: token
            },
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected');
        });

        newSocket.on('disconnect', () => {
            console.log('[Socket] Disconnected');
        });

        newSocket.on('connect_error', (err) => {
            console.error('[Socket] Connection Error:', err);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [token]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};
