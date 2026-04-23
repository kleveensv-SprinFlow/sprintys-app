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

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('competition-reminders', {
        name: 'Compétitions',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00E5FF',
      });
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "FOCUS COMPÉTITION DEMAIN 🏁",
        body: `Prépare ton sac pour ${city.toUpperCase()}. N'oublie pas tes pointes et tes épingles !`,
        data: { city },
        android: {
          channelId: 'competition-reminders',
        },
      },
      trigger: {
        date: reminderDate,
      } as any,
    });

    return identifier;
  },

  scheduleEliteBattlePlan: async (raceTime: string, callRoomTime: string, city: string) => {
    if (Platform.OS === 'web') return;

    const [rh, rm] = raceTime.split(':').map(Number);
    const [ch, cm] = callRoomTime.split(':').map(Number);
    
    const today = new Date();
    
    const scheduleAlert = async (hours: number, minutes: number, title: string, body: string, channel: string) => {
      const trigger = new Date(today);
      trigger.setHours(hours, minutes, 0, 0);
      
      if (trigger.getTime() < Date.now()) return;

      await Notifications.scheduleNotificationAsync({
        content: { title, body, android: { channelId: channel } },
        trigger,
      });
    };

    // Milestones
    await scheduleAlert(rh - 4, rm, "🍽️ DERNIER REPAS", "Focus glucides lents pour ton énergie.", 'competition-reminders');
    await scheduleAlert(rh - 2, rm, "🏟️ ARRIVÉE AU STADE", `C'est l'heure de l'élite à ${city.toUpperCase()}.`, 'competition-reminders');
    await scheduleAlert(rh - 1, rm - 30, "🔥 DÉBUT ÉCHAUFFEMENT", "Active la machine. Focus et intensité.", 'competition-reminders');
    await scheduleAlert(ch, cm - 10, "🏁 CHAMBRE D'APPEL DANS 10MIN", "Mise des pointes et vérification finale.", 'competition-reminders');
  },

  cancelAllNotifications: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
};
