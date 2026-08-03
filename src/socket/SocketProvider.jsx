import { useEffect, useState, useRef } from 'react';
import socketIOClient from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { SocketContext } from './SocketContext';

export const SocketProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const didConnect = useRef(false);

    useEffect(() => {
        if (!isAuthenticated) return;
        if (didConnect.current) return; // evita la doppia esecuzione in StrictMode (dev only)
        didConnect.current = true;

        console.log('[Socket] creo connessione con token:', user.accessToken);

        const newSocket = socketIOClient(`${import.meta.env.VITE_API_URL}/blog`, {
            transports: ['websocket'],
            query: { version: 'v1', platform: 'web', appVersion: '1', lang: 'it' },
            auth: { accessToken: user.accessToken }
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('[Socket] Connected to socket server');
            setConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('[Socket] Disconnected');
            setConnected(false);
        });

        newSocket.on('connect_error', (err) => {
            console.error('[Socket] Error connecting:', err.message);
            setConnected(false);
        });

        return () => {
            newSocket.disconnect();
            setSocket(null);
            setConnected(false);
            didConnect.current = false; // reset, così un futuro login crea un nuovo socket
        };
    }, [isAuthenticated, user]);

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
};