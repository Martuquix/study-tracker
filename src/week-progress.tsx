import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { parse, ymd, type Session, type Task } from './planner';
import { font, radius, space, useTheme, type Theme } from './theme';
import { buzz } from './ui';

const ON_TRACK = [
  'Vas al día. Sigue así.',
  'Buen ritmo: la constancia gana a la prisa.',
  'Cada sesión hecha es un examen menos temido.',
  'Sin saltarte ninguna. Así se llega con calma.',
];
const PERFECT = [
  '¡Semana completa! Has hecho todas las sesiones.',
  'Todo hecho. Hoy puedes descansar con la conciencia tranquila.',
  'Cien por cien. Así se llega a un examen con calma.',
];
const START = [
  'Todavía no has marcado ninguna sesión. Empezar es lo más difícil: hazlo hoy.',
  'La primera sesión de la semana es la que más cuesta. Empieza por una.',
];

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function WeekProgress({
  sessions,
  tasks,
  days,
  now,
}: {
  sessions: Session[];
  tasks: Task[];
  days: Date[];
  now: Date;
}) {
  const c = useTheme();
  const styles = makeStyles(c);

  const today = ymd(now);
  const first = ymd(days[0]);
  const last = ymd(days[6]);
  const hour = now.getHours();
  const seed = Math.floor(parse(today).getTime() / 864e5);
  const pick = (arr: string[]) => arr[seed % arr.length];

  const isPast = (s: Session) => s.date < today || (s.date === today && s.hour < hour);
  const known = new Set(tasks.map((t) => t.id));
  const week = sessions.filter((s) => s.date >= first && s.date <= last && known.has(s.task));
  const total = week.length;
  const done = week.filter((s) => s.done).length;
  const missed = week.filter((s) => !s.done && isPast(s)).length;
  const upcoming = total - done - missed;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const state = last < today ? 'past' : first > today ? 'future' : 'current';

  // Aviso de prisa: examen en los próximos 3 días con sesiones de estudio pendientes
  let urgent = '';
  if (state === 'current') {
    const pending: Record<string, number> = {};
    sessions.forEach((s) => {
      if (!s.done && !isPast(s)) pending[s.task] = (pending[s.task] ?? 0) + 1;
    });
    const soon = tasks
      .filter((t) => !t.done && t.type === 'examen' && t.date >= today && (pending[t.id] ?? 0) > 0)
      .map((t) => ({ t, n: Math.round((parse(t.date).getTime() - parse(today).getTime()) / 864e5) }))
      .filter((x) => x.n <= 3)
      .sort((a, b) => a.n - b.n)[0];
    if (soon) {
      const k = pending[soon.t.id];
      const when = soon.n === 0 ? 'hoy' : soon.n === 1 ? 'mañana' : `en ${soon.n} días`;
      urgent = `El examen de ${soon.t.subject} es ${when} y te quedan ${k} ${plural(k, 'sesión', 'sesiones')} de estudio. ¡Dale prioridad!`;
    }
  }

  let message = '';
  if (total === 0) {
    message =
      state === 'future'
        ? 'Todavía no hay sesiones planificadas para esa semana.'
        : 'No hay sesiones planificadas en esta semana.';
  } else if (state === 'future') {
    message = `Semana por empezar: ${total} ${plural(total, 'sesión planificada', 'sesiones planificadas')}.`;
  } else if (state === 'past') {
    message =
      pct >= 90
        ? `Semana redonda: ${done} de ${total}. ¡Así se estudia!`
        : pct >= 60
          ? `Buena semana: ${done} de ${total}. Intenta cerrar las que faltaron la próxima.`
          : `Semana floja: ${done} de ${total}. Una semana nueva es otra oportunidad: empieza por la primera sesión.`;
  } else if (done === total) {
    message = pick(PERFECT);
  } else if (missed > 0 && upcoming > 0) {
    message = `Te has saltado ${missed} ${plural(missed, 'sesión', 'sesiones')}. No te saltes ${
      upcoming === 1 ? 'la otra' : `las otras ${upcoming}`
    }: todavía llegas.`;
  } else if (missed > 0) {
    message = `Te has saltado ${missed} ${plural(missed, 'sesión', 'sesiones')} y esta semana no quedan más. Empieza la próxima con la primera sesión.`;
  } else if (done > 0) {
    message = `${pick(ON_TRACK)} Te ${plural(upcoming, 'queda', 'quedan')} ${upcoming} ${plural(upcoming, 'sesión', 'sesiones')}.`;
  } else {
    message = pick(START);
  }

  const label = state === 'current' ? 'esta semana' : state === 'past' ? 'esa semana' : 'esa semana';

  // La barra avanza con un resorte sin rebote; al llegar al 100 % vibra de éxito
  const [v] = useState(() => new Animated.Value(pct / 100));
  const prev = useRef(pct);
  useEffect(() => {
    Animated.spring(v, { toValue: pct / 100, stiffness: 300, damping: 35, mass: 1, useNativeDriver: false }).start();
    if (prev.current < 100 && pct === 100 && state === 'current') buzz('success');
    prev.current = pct;
  }, [pct, state, v]);
  const width = v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' });

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.pct}>{pct} %</Text>
        <Text style={styles.caption}>
          completadas {label} · {done} de {total}
        </Text>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width }]} />
      </View>

      <View style={styles.counts}>
        <Text style={styles.count}>
          <Text style={styles.countNum}>{done}</Text>
          {'\n'}hechas
        </Text>
        <Text style={styles.count}>
          <Text style={styles.countNum}>{upcoming}</Text>
          {'\n'}por hacer
        </Text>
        <Text style={styles.count}>
          <Text style={[styles.countNum, missed > 0 && styles.countMissed]}>{missed}</Text>
          {'\n'}saltadas
        </Text>
      </View>

      <Text style={styles.message}>{message}</Text>
      {urgent ? <Text style={styles.urgent}>{urgent}</Text> : null}
      {missed > 0 ? (
        <Text style={styles.hint}>
          Las sesiones pasadas que no marcaste cuentan como saltadas. Si las hiciste, tócalas en la cuadrícula para
          marcarlas como hechas.
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (c: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: radius.l,
      padding: space.l,
      marginTop: space.s,
      marginBottom: space.l,
      ...c.shadow,
    },
    top: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
    pct: { ...font.largeTitle, color: c.text, fontVariant: ['tabular-nums'] },
    caption: { ...font.caption, color: c.sub },
    track: { height: 6, borderRadius: 3, backgroundColor: c.fill, overflow: 'hidden', marginTop: space.s },
    fill: { height: 6, borderRadius: 3, backgroundColor: c.accent },
    counts: { flexDirection: 'row', gap: space.xl, marginTop: space.m },
    count: { ...font.caption, color: c.sub },
    countNum: { ...font.headline, color: c.text, fontVariant: ['tabular-nums'] },
    countMissed: { color: c.danger },
    message: { ...font.headline, color: c.text, marginTop: space.m },
    urgent: { ...font.caption, color: c.accentText, fontWeight: '700', marginTop: 6 },
    hint: { ...font.caption, color: c.sub, marginTop: 6 },
  });