import type { RealtimeEventPayload } from '../types/notification';

export const broadcastRealtimeEvent = (payload: RealtimeEventPayload) => {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('fizzdrop_realtime_events');
      channel.postMessage(payload);
      setTimeout(() => {
        try {
          channel.close();
        } catch {}
      }, 500);
    }
  } catch (err) {
    console.warn('Real-time event broadcast error', err);
  }
};
