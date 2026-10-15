import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../../store/authStore';
import { resultsOutbox } from '../../services/resultsOutbox';
import { toast } from '../feedback/appAlert';
import { syncSessionReminders } from '../../services/notifications';

/** Sends the results typed offline when the connection or the app comes back. Renders nothing. */
export function OutboxSync() {
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const run = async () => {
      try {
        const r = await resultsOutbox.flush(userId);
        if (!alive) return;
        if (r.sent > 0) syncSessionReminders(userId);
        if (r.sent > 0) toast('success', r.sent === 1 ? 'Ta séance enregistrée hors ligne a été envoyée.' : `${r.sent} séances enregistrées hors ligne ont été envoyées.`);
        if (r.dropped > 0) toast('warning', 'Une séance n’a pas pu être envoyée : elle a peut-être été supprimée par ton coach.');
      } catch {
        /* will retry at the next trigger */
      }
    };
    resultsOutbox.hydrate(userId).then(run);
    const net = NetInfo.addEventListener((s) => {
      if (s.isConnected !== false && s.isInternetReachable !== false) run();
    });
    const app = AppState.addEventListener('change', (st) => {
      if (st === 'active') run();
    });
    // Some devices report the connection late: a slow retry covers it
    const timer = setInterval(run, 60000);
    return () => {
      alive = false;
      net();
      app.remove();
      clearInterval(timer);
    };
  }, [userId]);

  return null;
}
