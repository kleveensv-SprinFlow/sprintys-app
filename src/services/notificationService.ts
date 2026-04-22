import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationService = {
  requestPermissions: async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  },

  scheduleCompetitionReminder: async (compDate: Date, city: string) => {
    // Programmer à 18h00 la veille de la compétition
    const reminderDate = new Date(compDate);
    reminderDate.setDate(reminderDate.getDate() - 1);
    reminderDate.setHours(18, 0, 0, 0);

    // Si l'heure est déjà passée, on ne programme pas
    if (reminderDate.getTime() < Date.now()) return;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "FOCUS COMPÉTITION DEMAIN 🏁",
        body: `Prépare ton sac pour ${city.toUpperCase()}. N'oublie pas tes pointes et tes épingles !`,
        data: { city },
      },
      trigger: reminderDate,
    });

    return identifier;
  },

  cancelAllNotifications: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
};
