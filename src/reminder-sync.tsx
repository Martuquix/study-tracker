import { useEffect } from 'react';
import { ymd } from './planner';
import { syncReminder } from './reminders';
import { useStore } from './store';

// Componente sin pantalla: solo vigila las sesiones y programa los avisos
export function ReminderSync() {
  const { sessions, tasks } = useStore();

  useEffect(() => {
    const now = new Date();
    const today = ymd(now);
    const h = now.getHours();
    const active = new Set(tasks.filter((t) => !t.done).map((t) => t.id));

    let missed = 0;
    let pending = 0;
    for (const s of sessions) {
      if (!active.has(s.task) || s.done) continue;
      const past = s.date < today || (s.date === today && s.hour < h);
      if (past) missed++;
      else pending++;
    }
    syncReminder(missed, pending);
  }, [sessions, tasks]);

  return null;
}