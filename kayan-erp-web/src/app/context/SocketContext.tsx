'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let tenantId = '1';
    let token = '';
    if (typeof window !== 'undefined') {
      try {
        const u = localStorage.getItem('kayan_user');
        if (u) {
          const parsed = JSON.parse(u);
          if (parsed.companyId) tenantId = String(parsed.companyId);
        }
        token = localStorage.getItem('kayan_token') || '';
      } catch (e) {
        console.warn(e);
      }
    }

    const socketInstance = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      auth: {
        tenantId,
        token,
      },
      query: {
        tenantId,
      },
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      // الانضمام الفوري لغرفة المستأجر المعزولة لمنع تسريب الإشعارات
      socketInstance.emit('join_tenant', tenantId);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('Socket reconnecting:', err.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
