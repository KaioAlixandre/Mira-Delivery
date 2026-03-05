
// Log global para depuração: saber se o componente está montando
(window as any).AdminOrderNotificationLoaded = true;


import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

const POLL_INTERVAL = 10000; // 10 segundos


const AdminOrderNotification: React.FC = () => {
  const { user } = useAuth();
 
  if (user) {
   
  }
  const [show, setShow] = useState(false);
  const lastOrderIdRef = useRef<number | null>(null);
  const isFirstLoadRef = useRef(true);
  const audioRef = useRef<HTMLAudioElement>(null);

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
           
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play();
            }
          }
        } else {
         
        }
      } catch (err) {
       
      }
    };

    let timeout: NodeJS.Timeout | null = null;
    let isFetching = false;

    const poll = async () => {
      if (isFetching) return;
      isFetching = true;
      await fetchOrders();
      isFetching = false;
      timeout = setTimeout(poll, POLL_INTERVAL);
    };

    poll(); // Inicia o polling imediatamente

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [user]);

  if (!user || user.funcao !== 'admin') return null;
  if (show) {
   
  }
  return (
    <>
      <audio ref={audioRef} src="\public\audio.mp3" preload="auto" loop />
      {show && (
        <div
          className="fixed top-4 left-4 z-[9999] flex items-center justify-center w-16 h-16 bg-purple-600 text-white rounded-full shadow-lg animate-fade-in cursor-pointer notification-status-ring"
          style={{ boxShadow: '0 4px 24px 0 rgba(80,0,120,0.18)', position: 'fixed', top: '1rem', left: '1rem', zIndex: 9999 }}
          onClick={() => {
            setShow(false);
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            }
          }}
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
