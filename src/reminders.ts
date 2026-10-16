import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const KEY = 'studytracker.reminder';
const REMIND_EVERY = 3; // un aviso por cada 3 sesiones saltadas (cámbialo a 2 si lo prefieres)
const HOUR = 16; // hora del aviso
const MINUTE = 20; // minuto del aviso

// Frases en el mismo tono que el seguimiento del plan
function phrase(missed: number, pending: number): { title: string; body: string } {
  const title = 'Study tracker';
  const variant = missed % 2;
  if (pending > 0) {
    const body =
      variant === 0
        ? `Te has saltado ${missed} sesiones. Todavía llegas: hoy con una la recuperas.`
        : `Te has saltado ${missed} sesiones y quedan ${pending} por delante. Empieza por la más cercana.`;
    return { title, body };
  }
  return {
    title,
    body: `Te has saltado ${missed} sesiones y no quedan más esta semana. Empieza la próxima con la primera.`,
  };
}

// La próxima hora de aviso: hoy si llegas con una hora de margen, si no mañana
function nextSlot(now: Date): Date {
  const d = new Date(now);
  d.setHours(HOUR, 0, 0, 0);
  if (d.getTime() - now.getTime() < 60 * 60 * 1000) d.setDate(d.getDate() + 1);
  return d;
}

export async function syncReminder(missed: number, pending: number) {
  try {
    const raw = await AsyncStorage.getItem(KEY);
       const state: { batch: number; id: string | null; hour?: number } = raw ? JSON.parse(raw) : { batch: 0, id: null };
    const batch = Math.floor(missed / REMIND_EVERY);

    // Si no ha cambiado el tramo, no hay nada que hacer
    if (batch === state.batch && state.hour === HOUR) return;

    // Quita el aviso anterior, que ya no corresponde a las saltadas actuales
    if (state.id) {
      await Notifications.cancelScheduledNotificationAsync(state.id).catch(() => {});
    }

    let id: string | null = null;
    if (batch > 0) {
      const cur = await Notifications.getPermissionsAsync();
      const perm = cur.granted ? cur : await Notifications.requestPermissionsAsync();
      if (perm.granted) {
        const when = nextSlot(new Date());
        id = await Notifications.scheduleNotificationAsync({
          content: { ...phrase(missed, pending), sound: true },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
        });
      }
    }

    await AsyncStorage.setItem(KEY, JSON.stringify({ batch, id, hour: HOUR }));
  } catch {}
}