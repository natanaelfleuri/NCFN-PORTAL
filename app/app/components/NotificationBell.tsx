'use client';
// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Shield, Database, ListTodo, Heart } from 'lucide-react';

interface Notification {
  id: string;
  type: 'canary' | 'vault_event' | 'new_feature' | 'heartbeat';
  message: string;
  detail?: string;
  time: string;
  persistent?: boolean; // canary alerts stay until dismissed
}

const TYPE_CONFIG = {
  canary: {
    label: 'Alerta Canary',
    icon: Shield,
    borderColor: 'border-red-500',
    bgColor: 'bg-red-950/90',
    textColor: 'text-red-300',
    badgeColor: 'bg-red-500',
    persistent: true,
  },
  vault_event: {
    label: 'Evento no Cofre',
    icon: Database,
    borderColor: 'border-blue-500/60',
    bgColor: 'bg-blue-950/90',
    textColor: 'text-blue-300',
    badgeColor: 'bg-blue-500',
    persistent: false,
  },
  new_feature: {
    label: 'Nova Tarefa',
    icon: ListTodo,
    borderColor: 'border-yellow-500/60',
    bgColor: 'bg-yellow-950/90',
    textColor: 'text-yellow-300',
    badgeColor: 'bg-yellow-500',
    persistent: false,
  },
  heartbeat: {
    label: 'Heartbeat',
    icon: Heart,
    borderColor: 'border-gray-700',
    bgColor: 'bg-gray-900/90',
    textColor: 'text-gray-400',
    badgeColor: 'bg-gray-500',
    persistent: false,
  },
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  const bellRef = useRef<HTMLButtonElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const dismissTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const seenIds = useRef<Set<string>>(new Set());

  const addNotification = useCallback((data: any) => {
    if (data.type === 'heartbeat') return;

    const cfg = TYPE_CONFIG[data.type as keyof typeof TYPE_CONFIG];
    if (!cfg) return;

    let message = '';
    let detail = '';

    if (data.type === 'canary') {
      message = `Arquivo canary acessado!`;
      detail = `${data.file} · IP: ${data.ip}`;
    } else if (data.type === 'vault_event') {
      message = `Evento: ${data.action}`;
      detail = `${data.file} · IP: ${data.ip}`;
    } else if (data.type === 'new_feature') {
      message = `Nova tarefa: ${data.title}`;
      detail = `Prioridade: ${data.priority} · por ${data.addedBy}`;
    }

    // Create a unique key to avoid duplicate notifications within the same poll cycle
    const dedupeKey = `${data.type}:${data.file || data.title}:${data.time}`;
    if (seenIds.current.has(dedupeKey)) return;
    seenIds.current.add(dedupeKey);
    // Keep seenIds bounded
    if (seenIds.current.size > 200) {
      const arr = Array.from(seenIds.current);
      seenIds.current = new Set(arr.slice(arr.length - 100));
    }

    const notif: Notification = {
      id: `${Date.now()}-${Math.random()}`,
      type: data.type,
      message,
      detail,
      time: data.time,
      persistent: cfg.persistent,
    };

    // Add to notification list
    setNotifications(prev => [notif, ...prev].slice(0, 50));
    setUnreadCount(c => c + 1);

    // Add to toasts (max 5 visible)
    setToasts(prev => [notif, ...prev].slice(0, 5));

    // Auto-dismiss non-persistent after 8s
    if (!cfg.persistent) {
      const timer = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== notif.id));
      }, 8000);
      dismissTimers.current[notif.id] = timer;
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    clearTimeout(dismissTimers.current[id]);
    delete dismissTimers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      const es = new EventSource('/api/admin/notifications');
      eventSourceRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          addNotification(data);
        } catch {}
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        retryTimeout = setTimeout(connect, 10000);
      };
    }

    connect();

    return () => {
      clearTimeout(retryTimeout);
      eventSourceRef.current?.close();
      Object.values(dismissTimers.current).forEach(clearTimeout);
    };
  }, [addNotification]);

  const handleBellClick = () => {
    if (!panelOpen && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setPanelOpen(p => !p);
    if (!panelOpen) setUnreadCount(0);
  };

  return (
    <>
      {/* Bell button */}
      <div className="relative">
        <button
          ref={bellRef}
          onClick={handleBellClick}
          className={`relative p-2 rounded-lg transition-colors ${
            panelOpen ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-gray-400 hover:text-white'
          }`}
          title="Notificações"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {connected && (
            <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Notification panel — portal, fixed position */}
      {panelOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[990]" onClick={() => setPanelOpen(false)} />
          <div
            className="fixed z-[991] w-80 bg-[#0d0d14]/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/80 overflow-hidden"
            style={{ top: panelPos.top, right: panelPos.right }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-xs font-bold text-white uppercase tracking-widest">Notificações</span>
              <button onClick={() => setPanelOpen(false)} className="text-gray-600 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-gray-600 text-xs">
                  <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  Nenhuma notificação
                </div>
              ) : (
                notifications.map(n => {
                  const cfg = TYPE_CONFIG[n.type];
                  const Icon = cfg?.icon || Bell;
                  return (
                    <div key={n.id} className={`px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] ${n.persistent ? 'border-l-2 border-l-red-500' : ''}`}>
                      <div className="flex items-start gap-2">
                        <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cfg?.textColor || 'text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${cfg?.textColor || 'text-gray-300'}`}>{n.message}</p>
                          {n.detail && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{n.detail}</p>}
                          <p className="text-[9px] text-gray-700 mt-1 font-mono">
                            {new Date(n.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={() => setNotifications([])}
                className="w-full py-2 text-[10px] text-gray-600 hover:text-gray-400 transition-colors border-t border-white/5"
              >
                Limpar tudo
              </button>
            )}
          </div>
        </>,
        document.body
      )}

      {/* Toast notifications (top-right) */}
      <div className="fixed top-4 right-4 z-[600] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => {
          const cfg = TYPE_CONFIG[toast.type];
          const Icon = cfg?.icon || Bell;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto w-72 rounded-xl border ${cfg?.borderColor} ${cfg?.bgColor} shadow-xl shadow-black/50 backdrop-blur-sm
                animate-in slide-in-from-right-4 duration-300`}
            >
              <div className="p-3 flex items-start gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg?.bgColor} border ${cfg?.borderColor}`}>
                  <Icon className={`w-3.5 h-3.5 ${cfg?.textColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-bold ${cfg?.textColor}`}>{toast.message}</p>
                  {toast.detail && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{toast.detail}</p>}
                  <p className="text-[9px] text-gray-600 mt-1 font-mono">
                    {new Date(toast.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="text-gray-600 hover:text-white shrink-0 mt-0.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
