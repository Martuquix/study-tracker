export type Task = {
  id: string;
  name: string;
  subject: string;
  type: 'examen' | 'deberes';
  date: string; // AAAA-MM-DD
  diff: number; // 1-5
  need: number; // 1-5
  done?: boolean;
};

export type Session = {
  id: string;
  task: string;
  date: string;
  hour: number;
  done: boolean;
  kind: string;
  pin?: boolean; // reservado para cuando añadamos mover sesiones
};

type Input = { tasks: Task[]; free: Record<string, boolean>; max: number; sessions: Session[] };
type Slot = { date: string; hour: number };

export const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 a 21:00

const p = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
export const parse = (s: string) => new Date(s + 'T00:00:00');
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const dow = (d: Date) => (d.getDay() + 6) % 7; // lunes = 0
const show = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};

// Horas de estudio que necesita cada tarea (misma fórmula que tu HTML)
export const hoursNeeded = (t: Task) =>
  t.type === 'examen' ? Math.round(3 + t.diff * 2.5 + t.need * 1.5) : Math.max(1, Math.round(t.diff * 0.6 + t.need * 0.4));

export function generate(data: Input, now = new Date()): { sessions: Session[]; warn: string[] } {
  const { tasks, free, max, sessions } = data;
  const today = ymd(now);
  const nh = now.getHours();
  const ids = new Set(tasks.map((t) => t.id));

  // Se conservan las sesiones hechas (y las movidas a mano que aún no han pasado)
  const keep = sessions.filter(
    (s) => ids.has(s.task) && (s.done || (s.pin && (s.date > today || (s.date === today && s.hour > nh)))),
  );
    const occ = new Set(keep.map((s) => `${s.date}-${s.hour}`));
  const per: Record<string, number> = {};
  keep.forEach((s) => (per[s.date] = (per[s.date] || 0) + 1));

  // Sesiones pasadas sin marcar como hechas: se conservan 6 semanas para contar las saltadas.
  // No cuentan como estudiadas, así que sus horas se vuelven a planificar más adelante.
  const activeIds = new Set(tasks.filter((t) => !t.done).map((t) => t.id));
  const since = ymd(addDays(now, -42));
  const missed = sessions.filter(
    (s) =>
      activeIds.has(s.task) &&
      !s.done &&
      s.date >= since &&
      (s.date < today || (s.date === today && s.hour < nh)),
  );
  missed.forEach((s) => {
    occ.add(`${s.date}-${s.hour}`);
    per[s.date] = (per[s.date] || 0) + 1;
  });

  const out: Session[] = [...keep, ...missed];
  const warn: string[] = [];

  // Primero las tareas más próximas; a igual fecha, las más difíciles y necesitadas
  const list = tasks
    .filter((t) => !t.done && t.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || b.diff * b.need - a.diff * a.need);

  for (const t of list) {
    const doneHours = keep.filter((s) => s.task === t.id).length;
    const rem = Math.max(0, hoursNeeded(t) - doneHours);
    if (!rem) continue;

    // Los exámenes se estudian hasta el día anterior; los deberes, hasta el día de entrega
    const last = t.type === 'examen' ? addDays(parse(t.date), -1) : parse(t.date);

    // Todas las horas libres disponibles hasta esa fecha
    const c: Slot[] = [];
    for (let d = parse(today); d <= last; d = addDays(d, 1)) {
      const ds = ymd(d);
      const w = dow(d);
      for (const h of HOURS) {
        if (!free[`${w}-${h}`]) continue;
        if (ds === today && h <= nh) continue;
        c.push({ date: ds, hour: h });
      }
    }

    const picked: Slot[] = [];
    const take = (x: Slot | undefined) => {
      if (!x) return false;
      const k = `${x.date}-${x.hour}`;
      if (occ.has(k) || (per[x.date] || 0) >= max) return false;
      occ.add(k);
      per[x.date] = (per[x.date] || 0) + 1;
      picked.push(x);
      return true;
    };

    if (t.type === 'examen') {
      // Reparte las horas a intervalos regulares hasta el examen
      for (let k = 0; k < rem && c.length; k++) {
        const i = Math.floor(((k + 0.5) * c.length) / rem);
        for (let r = 0; r < c.length; r++) {
          if (take(c[i + r]) || (r && take(c[i - r]))) break;
        }
      }
    } else {
      // Los deberes se dejan lo más cerca posible de la entrega
      for (let i = c.length - 1; i >= 0 && picked.length < rem; i--) take(c[i]);
    }

    picked.sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour);
    picked.forEach((x, i) =>
      out.push({
        id: `${t.id}|${x.date}|${x.hour}`,
        task: t.id,
        date: x.date,
        hour: x.hour,
        done: false,
        kind: t.type === 'examen' ? (i === picked.length - 1 && picked.length >= 3 ? 'Repaso final' : 'Estudio') : 'Deberes',
      }),
    );

    if (picked.length < rem) {
      warn.push(`${t.name}: faltan ${rem - picked.length} h por encajar antes del ${show(t.date)}. Libera más horas o sube el máximo diario.`);
    }
  }

  return { sessions: out, warn };
}
