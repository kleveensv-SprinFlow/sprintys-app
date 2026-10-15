import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { configureNotifications, notificationStatus, registerPushToken, routeOfNotification, syncSessionReminders } from '../../services/notifications';

configureNotifications();

/** Keeps reminders and the push token up to date, and opens the right screen when a notification is tapped. Renders nothing. */
export function NotificationsSync() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.user?.role);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const route = routeOfNotification(resp.notification.request.content.data);
      if (route) router.push(route as any);
    });
    // App opened from a notification while it was closed
    Notifications.getLastNotificationResponseAsync()
      .then((resp) => {
        const route = resp ? routeOfNotification(resp.notification.request.content.data) : null;
        if (route) setTimeout(() => router.push(route as any), 600);
      })
      .catch(() => undefined);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || !userId) return;
    const run = async () => {
      if ((await notificationStatus(userId)) !== 'on') return;
      registerPushToken(userId);
      if (role === 'athlete') syncSessionReminders(userId);
    };
    run();
    const app = AppState.addEventListener('change', (st) => {
      if (st === 'active') run();
    });
    return () => app.remove();
  }, [userId, role]);

  return null;
}
