import { useEffect, useState, useRef } from 'react';
import socketIOClient from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { SocketContext } from './SocketContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';


export const SocketProvider = ({ children }) => {
    const { user, isAuthenticated, logout } = useAuth();
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const navigate = useNavigate();

    const userRef = useRef(user);
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    const accessToken = user?.accessToken;

    useEffect(() => {
        if (!isAuthenticated || !accessToken) return;

        const newSocket = socketIOClient(`${import.meta.env.VITE_API_URL}/blog`, {
            transports: ['websocket'],
            query: { version: 'v1', platform: 'web', appVersion: '1', lang: 'it' },
            auth: (cb) => {
                cb({ accessToken: userRef.current?.accessToken });
            }
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
            if (err.message.includes('scaduta')) {
                logout();
                toast.error("Sessione scaduta. Effettua nuovamente il login.");
                 navigate("/login");
            }
        });

        return () => {
            newSocket.disconnect();
            setSocket(null);
            setConnected(false);
        };
    }, [isAuthenticated, accessToken]); // <-- solo valori primitivi

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
};