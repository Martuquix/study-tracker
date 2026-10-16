import * as Calendar from 'expo-calendar/legacy';
import { parse, type Session, type Task } from './planner';

const TITLE = 'Study tracker';

function startOf(s: Session) {
  const d = parse(s.date);
  d.setHours(s.hour, 0, 0, 0);
  return d;
}

export async function exportToCalendar(sessions: Session[], tasks: Task[]): Promise<string> {
  const perm = await Calendar.requestCalendarPermissionsAsync();
  if (perm.status !== 'granted') {
    return 'Sin permiso de calendario. Actívalo en Ajustes del iPhone → Expo Go → Calendarios.';
  }

  // Usa un calendario propio para no mezclar nada con tus eventos
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  let calId = calendars.find((c) => c.title === TITLE && c.allowsModifications)?.id;

  if (!calId) {
    const def = await Calendar.getDefaultCalendarAsync();
    calId = await Calendar.createCalendarAsync({
      title: TITLE,
      color: '#2F4BFF',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: def.source.id,
      source: def.source,
      name: 'studytracker',
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  }

  // Borra los eventos futuros anteriores de ese calendario y los vuelve a crear,
  // así exportar varias veces no duplica nada
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setFullYear(to.getFullYear() + 1);
  const old = await Calendar.getEventsAsync([calId], from, to);
  for (const e of old) await Calendar.deleteEventAsync(e.id);

  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const now = new Date();
  const pending = sessions.filter((s) => !s.done && byId[s.task] && startOf(s) > now);

  for (const s of pending) {
    const start = startOf(s);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    await Calendar.createEventAsync(calId, {
      title: `${byId[s.task].name} (${s.kind})`,
      startDate: start,
      endDate: end,
      alarms: [{ relativeOffset: -10 }], // aviso 10 minutos antes
    });
  }

  return `${pending.length} sesiones exportadas al calendario "${TITLE}".`;
}