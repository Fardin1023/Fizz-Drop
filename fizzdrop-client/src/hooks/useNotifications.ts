import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppNotification, RealtimeEventPayload } from '../types/notification';
import { playNotificationChime } from '../utils/sound';

export const useNotifications = (
  role: 'SUPERADMIN' | 'SUPPLIER',
  userId?: number,
  enabled: boolean = true
) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [popupNotification, setPopupNotification] = useState<AppNotification | null>(null);

  const seenIdsRef = useRef<Set<number>>(new Set());
  const initialLoadDoneRef = useRef<boolean>(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const dismissPopup = useCallback(() => {
    setPopupNotification(null);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!enabled) return;
    try {
      const url = `http://localhost:8080/api/v1/notifications?role=${role}${
        userId ? `&userId=${userId}` : ''
      }`;
      const res = await fetch(url);
      if (!res.ok) return;

      const data: AppNotification[] = await res.json();
      setNotifications(data);

      const unread = data.filter((n) => !n.is_read).length;
      setUnreadCount(unread);

      // On first load, seed the seen IDs without triggering pop-ups
      if (!initialLoadDoneRef.current) {
        data.forEach((n) => seenIdsRef.current.add(n.id));
        initialLoadDoneRef.current = true;
        return;
      }

      // Check if there are newly arrived notifications
      const newlyArrived = data.find((n) => !seenIdsRef.current.has(n.id) && !n.is_read);
      if (newlyArrived) {
        // Track all seen IDs
        data.forEach((n) => seenIdsRef.current.add(n.id));

        // Show animated pop-up window
        setPopupNotification(newlyArrived);

        // Play chime sound
        const chimeType =
          newlyArrived.type === 'APPROVED'
            ? 'success'
            : newlyArrived.type === 'REJECTED'
            ? 'alert'
            : 'info';
        playNotificationChime(chimeType);
      } else {
        data.forEach((n) => seenIdsRef.current.add(n.id));
      }
    } catch {
      // Non-blocking fetch failure
    }
  }, [role, userId, enabled]);

  // Mark a single notification as read
  const markAsRead = useCallback(async (id: number) => {
    try {
      await fetch(`http://localhost:8080/api/v1/notifications/${id}/read`, {
        method: 'PUT',
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await fetch(
        `http://localhost:8080/api/v1/notifications/mark-all-read?role=${role}${
          userId ? `&userId=${userId}` : ''
        }`,
        { method: 'PUT' }
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  }, [role, userId]);

  // Broadcast event across browser tabs
  const broadcastEvent = useCallback((payload: RealtimeEventPayload) => {
    try {
      if (channelRef.current) {
        channelRef.current.postMessage(payload);
      }
    } catch (err) {
      console.warn('BroadcastChannel error', err);
    }
  }, []);

  // Setup BroadcastChannel & Polling
  useEffect(() => {
    if (!enabled) return;

    // 1. Initial fetch
    fetchNotifications();

    // 2. Setup BroadcastChannel for real-time cross-tab instant sync
    try {
      const channel = new BroadcastChannel('fizzdrop_realtime_events');
      channelRef.current = channel;

      channel.onmessage = (event: MessageEvent<RealtimeEventPayload>) => {
        const payload = event.data;
        if (!payload) return;

        // If message is directed to our role
        if (payload.recipientRole === role) {
          if (!payload.recipientUserId || !userId || payload.recipientUserId === userId) {
            // Immediate fetch from backend
            fetchNotifications();

            // Also synthesize immediate pop-up if not already showing
            const syntheticNotif: AppNotification = {
              id: Date.now(),
              recipient_role: role,
              recipient_user_id: payload.recipientUserId,
              title: payload.title,
              message: payload.message,
              type: payload.type === 'NEW_REQUISITION' ? 'NEW_REQUISITION' : payload.status || 'APPROVED',
              reference_code: payload.referenceCode,
              reference_id: payload.referenceId,
              is_read: false,
              created_at: new Date().toISOString(),
            };
            setPopupNotification(syntheticNotif);

            const chimeType =
              payload.status === 'APPROVED'
                ? 'success'
                : payload.status === 'REJECTED'
                ? 'alert'
                : 'info';
            playNotificationChime(chimeType);
          }
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel not supported', err);
    }

    // 3. Setup periodic polling interval (every 3.5 seconds)
    const interval = setInterval(() => {
      fetchNotifications();
    }, 3500);

    return () => {
      clearInterval(interval);
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, [role, userId, enabled, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    popupNotification,
    dismissPopup,
    markAsRead,
    markAllAsRead,
    broadcastEvent,
    fetchNotifications,
  };
};

export default useNotifications;
