import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, organization } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !user.orgId) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const socketInstance = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      setConnected(true);
      socketInstance.emit('join:org', user.orgId);
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
    });

    socketInstance.on('connect_error', () => {
      setConnected(false);
    });

    // Domain Event Listeners
    socketInstance.on('incident:created', (incident) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast(
        (t) => (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-severity-p1 animate-pulse shadow-[0_0_8px_rgba(229,193,133,0.4)]" />
            <span className="text-xs">
              <strong className="font-mono text-severity-p1">INC-{String(incident.incidentNumber).padStart(5, '0')}</strong>{' '}
              {incident.title}
            </span>
          </div>
        ),
        {
          duration: 2200,
          style: { borderLeft: '3px solid #C8A97E' },
        }
      );
    });

    socketInstance.on('incident:updated', (incident) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident', incident._id] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    });

    socketInstance.on('incident:escalated', ({ incident, breachMinutes, slaLimitMinutes }) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident', incident._id] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.error(
        `🚨 SLA ESCALATION: INC-${String(incident.incidentNumber).padStart(5, '0')} unacknowledged for ${breachMinutes}m!`,
        {
          duration: 2200,
        }
      );
    });

    socketInstance.on('incident:transitioned', ({ incident }) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident', incident._id] });
      queryClient.invalidateQueries({ queryKey: ['timeline', incident._id] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    });

    socketInstance.on('webhook:deduplicated', ({ incidentId, source }) => {
      queryClient.invalidateQueries({ queryKey: ['timeline', incidentId] });
      toast(
        `🛡️ Alert Ingest: Deduplicated incoming alert from ${source.toUpperCase()}`,
        { icon: '🔄' }
      );
    });

    socketInstance.on('postmortem:published', () => {
      queryClient.invalidateQueries({ queryKey: ['postmortems'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    });

    // Fallback: Listen for local mock events when backend socket is offline
    const handleMockEvent = (e) => {
      const { event, data } = e.detail || {};
      if (event === 'incident:created') {
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        toast(
          (t) => (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-severity-p1 animate-pulse shadow-[0_0_8px_rgba(229,193,133,0.4)]" />
              <span className="text-xs">
                <strong className="font-mono text-severity-p1">INC-{String(data.incidentNumber).padStart(5, '0')}</strong>{' '}
                {data.title}
              </span>
            </div>
          ),
          {
            duration: 2200,
            style: { borderLeft: '3px solid #C8A97E' },
          }
        );
      } else if (event === 'incident:transitioned') {
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
        queryClient.invalidateQueries({ queryKey: ['incident', data._id || data.id] });
        queryClient.invalidateQueries({ queryKey: ['timeline', data._id || data.id] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
      }
    };
    window.addEventListener('pulse:mock-event', handleMockEvent);

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      window.removeEventListener('pulse:mock-event', handleMockEvent);
    };
  }, [user?.orgId, queryClient]);

  const joinIncident = (incidentId) => {
    if (socket) {
      socket.emit('join:incident', incidentId);
    }
  };

  const leaveIncident = (incidentId) => {
    if (socket) {
      socket.emit('leave:incident', incidentId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, joinIncident, leaveIncident }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
