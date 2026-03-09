(window as any).AdminOrderNotificationLoaded = true;

import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

const POLL_INTERVAL = 10000; // 10 segundos
const NOTIFICATION_SOUND = 'bell_ring';

declare global {
  interface Window {
    ion?: {
      sound: {
        (config: {
          sounds?: Array<{ name: string; volume?: number; loop?: boolean }>;
          path?: string;
          preload?: boolean;
          volume?: number;
        }): void;
        play: (name: string) => void;
        stop: (name: string) => void;
        pause: (name: string) => void;
      };
    };
  }
}

const AdminOrderNotification: React.FC = () => {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const lastOrderIdRef = useRef<number | null>(null);
  const isFirstLoadRef = useRef(true);
  const ionSoundInitialized = useRef(false);

  // Inicializar ion.sound com som de notificação (sons do repositório ion.sound via CDN)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ion?.sound) return;
    if (ionSoundInitialized.current) return;
    try {
      (window.ion.sound as any)({
        sounds: [{ name: NOTIFICATION_SOUND, volume: 0.6, loop: true }],
        path: 'https://cdn.jsdelivr.net/gh/IonDen/ion.sound@3.0.7/sounds/',
        preload: true,
        volume: 0.6,
      });
      ionSoundInitialized.current = true;
    } catch (_) {
      // Fallback: path local (coloque bell_ring.mp3 em public/sounds/ se quiser)
      try {
        (window.ion.sound as any)({
          sounds: [{ name: NOTIFICATION_SOUND, volume: 0.6, loop: true }],
          path: '/sounds/',
          preload: true,
          volume: 0.6,
        });
        ionSoundInitialized.current = true;
      } catch (_e) {}
    }
  }, []);

  useEffect(() => {
    if (!user || user.funcao !== 'admin') return;

    const fetchOrders = async () => {
      try {
        const orders = await apiService.getOrdersAdmin();
        if (Array.isArray(orders) && orders.length > 0) {
          const newestOrder = orders[0];
          if (isFirstLoadRef.current) {
            lastOrderIdRef.current = newestOrder.id;
            isFirstLoadRef.current = false;
          } else if (newestOrder.id !== lastOrderIdRef.current) {
            lastOrderIdRef.current = newestOrder.id;
            setShow(true);
            try {
              if (window.ion?.sound?.stop) {
                window.ion.sound.stop(NOTIFICATION_SOUND);
              }
              if (window.ion?.sound?.play) {
                window.ion.sound.play(NOTIFICATION_SOUND);
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    };

    let timeout: ReturnType<typeof setTimeout> | null = null;
    let isFetching = false;

    const poll = async () => {
      if (isFetching) return;
      isFetching = true;
      await fetchOrders();
      isFetching = false;
      timeout = setTimeout(poll, POLL_INTERVAL);
    };

    poll();
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [user]);

  useEffect(() => {
    const handleOrderDeleted = () => {
      setShow(false);
      try {
        if (window.ion?.sound?.stop) {
          window.ion.sound.stop(NOTIFICATION_SOUND);
        }
      } catch (_) {}
    };
    window.addEventListener('admin-order-deleted', handleOrderDeleted);
    return () => window.removeEventListener('admin-order-deleted', handleOrderDeleted);
  }, []);

  const stopSound = () => {
    try {
      if (window.ion?.sound?.stop) {
        window.ion.sound.stop(NOTIFICATION_SOUND);
      }
    } catch (_) {}
    setShow(false);
  };

  if (!user || user.funcao !== 'admin') return null;

  return (
    <>
      {show && (
        <div
          className="fixed top-4 left-4 z-[9999] flex items-center justify-center w-16 h-16 bg-brand text-white rounded-full shadow-lg animate-fade-in cursor-pointer notification-status-ring"
          style={{
            boxShadow: '0 4px 24px 0 color-mix(in srgb, var(--primary-color) 30%, transparent)',
            position: 'fixed',
            top: '1rem',
            left: '1rem',
            zIndex: 9999,
          }}
          onClick={stopSound}
          title="Clique para silenciar a notificação"
        >
          <span className="absolute inset-0 rounded-full notification-status-anim" />
          <Bell size={36} className="relative z-10" />
        </div>
      )}
    </>
  );
};

export default AdminOrderNotification;
