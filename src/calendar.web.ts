import { parse, type Session, type Task } from './planner';

const p = (n: number) => String(n).padStart(2, '0');
const esc = (s: string) => s.replace(/[\\;,]/g, '\\$&');
const stamp = (d: Date) =>
  `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;

function startOf(s: Session) {
  const d = parse(s.date);
  d.setHours(s.hour, 0, 0, 0);
  return d;
}

export async function exportToCalendar(sessions: Session[], tasks: Task[]): Promise<string> {
  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const now = new Date();
  const pending = sessions.filter((s) => !s.done && byId[s.task] && startOf(s) > now);
  if (pending.length === 0) return 'No hay sesiones pendientes que exportar.';

  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//StudyTracker//ES'];
  for (const s of pending) {
    const start = startOf(s);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    const title = `${byId[s.task].name} (${s.kind})`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${s.id.replace(/\|/g, '-')}@studytracker`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(title)}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT10M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(title)}`,
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plan-estudio.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return `${pending.length} sesiones descargadas en plan-estudio.ics. Ábrelo para añadirlas a tu calendario.`;
}