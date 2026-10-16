import { useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { exportToCalendar } from '../calendar';
import { addDays, dow, HOURS, ymd, type Session } from '../planner';
import { useStore } from '../store';
import { font, MAX_W, radius, space, subjectColor, TAB_PAD, useTheme, type Theme } from '../theme';
import { buzz, PressableScale } from '../ui';
import { WeekProgress } from '../week-progress';

const LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const HOURW = 34; // ancho de la columna de horas
const HEADH = 54; // alto de la cabecera con los días
const ROWH = 46; // alto de cada hora

type Cell = { date: string; hour: number };

export default function Plan() {
  const c = useTheme();
  const styles = makeStyles(c);
  const { tasks, sessions, warn, free, update } = useStore();
  const { width } = useWindowDimensions();
  const [wk, setWk] = useState(0);
  const [msg, setMsg] = useState('');
  const [scroll, setScroll] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [target, setTarget] = useState<Cell | null>(null);
  const [resetNote, setResetNote] = useState('');
  const [fade] = useState(() => new Animated.Value(0));
  const navigation = useNavigation();
     useEffect(() => {
       // Mientras arrastras una sesión, deslizar entre pestañas se desactiva
       navigation.setOptions({ swipeEnabled: scroll });
     }, [navigation, scroll]);
  const gridRef = useRef<View>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<string | null>(null);
  const moved = useRef(false);
  const lastCell = useRef('');
  const latest = useRef({
    onMove: (_x: number, _y: number) => {},
    finish: (_x: number, _y: number) => {},
    cancel: () => {},
  });

  const now = new Date();
  const today = ymd(now);
  const mon = addDays(now, -dow(now) + wk * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const colW = Math.floor((Math.min(width, MAX_W) - 32 - 2 - HOURW) / 7);
  const wide = colW > 90;
  const done = sessions.filter((s) => s.done).length;
  const movedCount = sessions.filter((s) => s.pin && !s.done).length;
  const hasTasks = tasks.some((t) => !t.done && t.date >= today);

  const m1 = MONTHS[days[0].getMonth()];
  const m2 = MONTHS[days[6].getMonth()];
  const monthLabel = m1 === m2 ? m1 : `${m1} / ${m2}`;

  const weekIds = new Set(
    sessions.filter((s) => s.date >= ymd(days[0]) && s.date <= ymd(days[6])).map((s) => s.task),
  );
  const legend = tasks.filter((t) => weekIds.has(t.id));

  const dragSess = sessions.find((x) => x.id === dragId);
  const dragTask = dragSess ? tasks.find((t) => t.id === dragSess.task) : undefined;

  function toggle(id: string) {
    const s = sessions.find((x) => x.id === id);
    buzz(s && !s.done ? 'success' : 'light');
    update({ sessions: sessions.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) });
  }

  // Muestra un aviso que aparece y se desvanece solo
  function flash(text: string) {
    setResetNote(text);
    fade.stopAnimation();
    fade.setValue(0);
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }

  // Quita las marcas de "movida" y deja que el algoritmo recoloque todo
  function resetAuto() {
    if (movedCount === 0) {
      buzz('light');
      flash('El plan ya es el automático. No hay sesiones movidas.');
      return;
    }
    buzz('success');
    update({ tasks, sessions: sessions.map((s) => ({ ...s, pin: false })) });
    flash(
      movedCount === 1
        ? 'Plan automático restaurado: 1 sesión recolocada.'
        : `Plan automático restaurado: ${movedCount} sesiones recolocadas.`,
    );
  }

  async function exportCal() {
    setMsg('Exportando…');
    try {
      setMsg(await exportToCalendar(sessions, tasks));
    } catch (e) {
      console.warn(e);
      buzz('warning');
      setMsg('Error: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  // ---------- Arrastrar y soltar ----------

  // Convierte un punto de la pantalla en (día, hora) de la cuadrícula
  function locate(px: number, py: number): Cell | null {
    const o = origin.current;
    if (!o) return null;
    const col = Math.floor((px - o.x - HOURW) / colW);
    const row = Math.floor((py - o.y - HEADH) / ROWH);
    if (col < 0 || col > 6 || row < 0 || row >= HOURS.length) return null;
    return { date: ymd(days[col]), hour: HOURS[row] };
  }

  function startDrag(s: Session) {
    dragRef.current = s.id;
    moved.current = false;
    lastCell.current = '';
    buzz('light');
    setMsg('');
    setDragId(s.id);
    setScroll(false); // mientras arrastras, la pantalla no se desplaza
    gridRef.current?.measureInWindow((x, y) => {
      origin.current = { x, y };
    });
  }

  function endDrag() {
    dragRef.current = null;
    moved.current = false;
    lastCell.current = '';
    setDragId(null);
    setGhost(null);
    setTarget(null);
    setScroll(true);
  }

  function onMove(px: number, py: number) {
    const o = origin.current;
    if (o) setGhost({ x: px - o.x, y: py - o.y });
    const cell = locate(px, py);
    // Un tic cada vez que el dedo pasa a otra casilla
    const key = cell ? `${cell.date}-${cell.hour}` : '';
    if (key !== lastCell.current) {
      lastCell.current = key;
      if (key) buzz('select');
    }
    setTarget(cell);
  }

  function finish(px: number, py: number) {
    const id = dragRef.current;
    const cell = locate(px, py);
    endDrag();
    if (!id || !cell) return;
    const s = sessions.find((x) => x.id === id);
    if (!s || (s.date === cell.date && s.hour === cell.hour)) return;
    if (cell.date < today || (cell.date === today && cell.hour <= now.getHours())) {
      buzz('warning');
      setMsg('No puedes mover una sesión a una hora que ya pasó.');
      return;
    }
    const o = sessions.find((x) => x.date === cell.date && x.hour === cell.hour);
    if (o && o.done) {
      buzz('warning');
      setMsg('Esa hora ya tiene una sesión hecha.');
      return;
    }
    const put = (x: Session, date: string, hour: number): Session => ({
      ...x,
      date,
      hour,
      id: `${x.task}|${date}|${hour}`,
      pin: true,
    });
    buzz('success');
    // Si sueltas sobre otra sesión pendiente, se intercambian
    update({
      sessions: sessions.map((x) =>
        x.id === s.id ? put(x, cell.date, cell.hour) : o && x.id === o.id ? put(x, s.date, s.hour) : x,
      ),
    });
  }

  useEffect(() => {
    latest.current = { onMove, finish, cancel: endDrag };
  });

  const [pan] = useState(() =>
    PanResponder.create({
      // Una vez activada la pulsación larga, esta vista se queda con el dedo
      onMoveShouldSetPanResponderCapture: () => {
        if (!dragRef.current) return false;
        moved.current = true;
        return true;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (e) => latest.current.onMove(e.nativeEvent.pageX, e.nativeEvent.pageY),
      onPanResponderRelease: (e) => latest.current.finish(e.nativeEvent.pageX, e.nativeEvent.pageY),
      onPanResponderTerminate: () => latest.current.cancel(),
    }),
  );

  if (!hasTasks) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['top']}>
        <Text style={styles.emptyTitle}>Todavía no hay nada que planificar</Text>
        <Text style={styles.meta}>
          Añade un examen o unos deberes con fecha futura con el botón + y el plan se crea solo.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} scrollEnabled={scroll}>
        <Text style={styles.title}>{monthLabel}</Text>

           <WeekProgress sessions={sessions} tasks={tasks} days={days} now={now} />

        {warn.map((w) => (
          <Text key={w} style={styles.warn}>{w}</Text>
        ))}

        <PressableScale style={styles.exportBtn} haptic="light" onPress={exportCal}>
          <Text style={styles.exportText}>Exportar al calendario</Text>
        </PressableScale>

        <View style={styles.nav}>
          <PressableScale style={styles.navBtn} haptic="select" onPress={() => setWk(wk - 1)}>
            <Text style={styles.navText}>Anterior</Text>
          </PressableScale>
          <PressableScale scaleTo={0.95} onPress={() => setWk(0)}>
            <Text style={styles.week}>
              {days[0].getDate()}/{days[0].getMonth() + 1} – {days[6].getDate()}/{days[6].getMonth() + 1}
            </Text>
          </PressableScale>
          <PressableScale style={styles.navBtn} haptic="select" onPress={() => setWk(wk + 1)}>
            <Text style={styles.navText}>Siguiente</Text>
          </PressableScale>
        </View>

        {msg ? <Text style={styles.msg}>{msg}</Text> : null}

        <View ref={gridRef} style={styles.grid} {...pan.panHandlers}>
          <View style={styles.headRow}>
            <View style={{ width: HOURW }} />
            {days.map((d, i) => {
              const isT = ymd(d) === today;
              return (
                <View key={i} style={[styles.dhead, { width: colW }]}>
                  <Text style={styles.dletter}>{LETTERS[i]}</Text>
                  <View style={[styles.dnum, isT && styles.dnumToday]}>
                    <Text style={[styles.dnumText, isT && styles.dnumTextToday]}>{d.getDate()}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {HOURS.map((h) => (
            <View key={h} style={styles.hrow}>
              <Text style={styles.hlabel}>{h}:00</Text>
              {days.map((d, i) => {
                const ds = ymd(d);
                const s = sessions.find((x) => x.date === ds && x.hour === h);
                const t = s ? tasks.find((x) => x.id === s.task) : undefined;
                const isTarget = target?.date === ds && target?.hour === h;
                const missedNow = !!s && !s.done && (ds < today || (ds === today && h < now.getHours()));
                return (
                  <View
                    key={i}
                    style={[
                      styles.cell,
                      { width: colW },
                      ds === today && styles.cellToday,
                      !!free[`${i}-${h}`] && styles.cellFree,
                      isTarget && styles.cellTarget,
                    ]}
                  >
                    {s && t ? (
                      <PressableScale
                        scaleTo={0.92}
                        onPress={() => toggle(s.id)}
                        onLongPress={s.done ? undefined : () => startDrag(s)}
                        delayLongPress={250}
                        onPressOut={() => {
                          // Pulsación larga sin mover el dedo: cancela el arrastre
                          if (dragRef.current && !moved.current) endDrag();
                        }}
                        style={[
                          styles.blk,
                          { backgroundColor: subjectColor(t.subject) + '33', borderLeftColor: subjectColor(t.subject) },
                          s.done && styles.blkDone,
                          dragId === s.id && styles.blkDrag,
                        ]}
                      >
                        <Text style={[styles.blkText, wide && { fontSize: 11 }, s.done && styles.strike]} numberOfLines={2}>
  {t.subject}
</Text>
  <Text style={[styles.blkKind, missedNow && styles.blkMissed]} numberOfLines={1}>
    {missedNow ? 'Sin hacer' : s.kind === 'Repaso final' ? 'Repaso' : s.kind}
  </Text>
                      </PressableScale>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}

          {ghost && dragTask ? (
            <View
              pointerEvents="none"
              style={[
                styles.ghost,
                {
                  left: ghost.x - colW / 2,
                  top: ghost.y - ROWH / 2,
                  width: colW,
                  height: ROWH,
                  backgroundColor: subjectColor(dragTask.subject),
                },
              ]}
            >
              <Text style={styles.ghostText} numberOfLines={3}>{dragTask.subject}</Text>
            </View>
          ) : null}
        </View>

        {legend.length > 0 ? (
          <View style={styles.legend}>
            {legend.map((t) => (
              <View key={t.id} style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: subjectColor(t.subject) }]} />
                <Text style={styles.legendText}>
  <Text style={styles.legendSubject}>{t.subject}</Text>
  {t.name !== t.subject ? `  ·  ${t.name}` : ''}
</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.meta}>
          Toca una sesión para marcarla como hecha. Mantenla pulsada y arrástrala para moverla. Las horas teñidas son tus horas libres.
        </Text>

        <PressableScale style={[styles.resetBtn, movedCount === 0 && styles.resetBtnOff]} onPress={resetAuto}>
          <Text style={styles.resetText}>
            Volver al plan automático{movedCount > 0 ? ` (${movedCount} ${movedCount === 1 ? 'movida' : 'movidas'})` : ''}
          </Text>
        </PressableScale>
        <Animated.Text style={[styles.resetNote, { opacity: fade }]}>{resetNote}</Animated.Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { alignItems: 'center', justifyContent: 'center', padding: space.xl },
    content: { paddingHorizontal: space.l, paddingTop: space.s, paddingBottom: TAB_PAD },
    title: { ...font.largeTitle, color: c.text },
    emptyTitle: { ...font.title, color: c.text, textAlign: 'center' },
    meta: { ...font.caption, color: c.sub, marginTop: 10, textAlign: 'center' },
    msg: { ...font.caption, color: c.danger, textAlign: 'center', marginBottom: 8, fontWeight: '600' },
    stats: { flexDirection: 'row', gap: space.xl, marginTop: space.s, marginBottom: space.l },
    stat: { ...font.caption, color: c.sub },
    big: { ...font.title, color: c.text, fontVariant: ['tabular-nums'] },
    warn: {
      ...font.caption,
      backgroundColor: c.dangerSoft,
      color: c.danger,
      borderRadius: radius.s,
      padding: space.m,
      marginBottom: 8,
      overflow: 'hidden',
    },
    exportBtn: { backgroundColor: c.accent, borderRadius: radius.m, paddingVertical: 14, alignItems: 'center' },
    exportText: { ...font.headline, color: c.onAccent },
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: space.m,
    },
    navBtn: { backgroundColor: c.fill, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
    navText: { ...font.caption, color: c.text, fontWeight: '600' },
    week: { ...font.headline, color: c.text },

    grid: {
      backgroundColor: c.card,
      borderRadius: radius.m,
      paddingBottom: 8,
      ...c.shadow,
    },
    headRow: { flexDirection: 'row', height: HEADH, alignItems: 'center' },
    dhead: { alignItems: 'center', justifyContent: 'center' },
    dletter: { ...font.caption, fontSize: 11, color: c.sub, marginBottom: 2 },
    dnum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    dnumToday: { backgroundColor: c.today },
    dnumText: { fontSize: 15, fontWeight: '600', color: c.text },
    dnumTextToday: { color: c.onAccent },
    hrow: { flexDirection: 'row', height: ROWH },
    hlabel: { width: HOURW, fontSize: 10, color: c.sub, textAlign: 'right', paddingRight: 4, paddingTop: 2 },
    cell: {
      height: ROWH,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
    },
    cellToday: { backgroundColor: c.fill },
    cellFree: { backgroundColor: c.accentSoft },
    cellTarget: { backgroundColor: c.accent + '55' },
    blk: { flex: 1, margin: 1.5, borderLeftWidth: 3, borderRadius: 6, padding: 2, justifyContent: 'center' },
    blkDone: { opacity: 0.45 },
    blkDrag: { opacity: 0.3 },
    blkText: { fontSize: 9, fontWeight: '600', color: c.text },
    blkKind: { fontSize: 8, fontWeight: '500', color: c.sub, marginTop: 1 },
    blkMissed: { color: c.danger, fontWeight: '700' },
    strike: { textDecorationLine: 'line-through' },
    ghost: {
      position: 'absolute',
      borderRadius: 8,
      padding: 3,
      justifyContent: 'center',
      zIndex: 10,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      transform: [{ scale: 1.08 }],
    },
    ghostText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },

    legend: { marginTop: space.l, gap: 6 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { ...font.caption, color: c.text },
    legendSubject: { fontWeight: '700' },
    resetBtn: { backgroundColor: c.fill, borderRadius: radius.m, paddingVertical: 14, alignItems: 'center', marginTop: space.l },
    resetBtnOff: { opacity: 0.5 },
    resetText: { ...font.headline, fontSize: 15, color: c.text },
    resetNote: { ...font.caption, color: c.good, fontWeight: '600', textAlign: 'center', marginTop: 10, minHeight: 20 },
  });