import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { font, space, TAB_PAD, useTheme, type Theme } from '../theme';
import { buzz, PressableScale, Segmented } from '../ui';

// Con la app abierta se avisa dentro de la app; la notificación es solo para segundo plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const MODES = {
  foco: { label: 'Foco 50 min', secs: 50 * 60 },
  corto: { label: 'Descanso 10 min', secs: 10 * 60 },
  largo: { label: 'Descanso 30 min', secs: 30 * 60 },
} as const;
type Mode = keyof typeof MODES;

const ORDER: Mode[] = ['foco', 'corto', 'largo'];
const SHORT: Record<Mode, string> = { foco: 'Foco 50', corto: 'Pausa 10', largo: 'Pausa 30' };
const NAME: Record<Mode, string> = { foco: 'Foco', corto: 'Descanso corto', largo: 'Descanso largo' };

const pad = (n: number) => String(n).padStart(2, '0');
const mmss = (s: number) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

export default function Pomodoro() {
  const c = useTheme();
  const styles = makeStyles(c);
  const [mode, setMode] = useState<Mode>('foco');
  const [left, setLeft] = useState<number>(MODES.foco.secs);
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [note, setNote] = useState('');
  const [area, setArea] = useState({ w: 0, h: 0 });
  const endRef = useRef(0); // momento exacto en que termina el temporizador
  const notifRef = useRef<string | null>(null); // id de la notificación programada

  async function cancelAlert() {
    const id = notifRef.current;
    notifRef.current = null;
    if (id) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {}
    }
  }

  async function scheduleAlert(seconds: number, m: Mode) {
    try {
      const cur = await Notifications.getPermissionsAsync();
      const perm = cur.granted ? cur : await Notifications.requestPermissionsAsync();
      if (!perm.granted) {
        setNote('Activa las notificaciones de Expo Go en Ajustes para recibir el aviso con la app en segundo plano.');
        return;
      }
      notifRef.current = await Notifications.scheduleNotificationAsync({
        content: {
          title: m === 'foco' ? 'Foco terminado' : 'Descanso terminado',
          body: m === 'foco' ? 'Toca descansar.' : 'Listo para otro foco.',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(1, seconds),
        },
      });
    } catch {}
  }

  function choose(m: Mode) {
    cancelAlert();
    setMode(m);
    setLeft(MODES[m].secs);
    setRunning(false);
    setNote('');
  }

  function toggle() {
    buzz('light');
    if (running) {
      cancelAlert();
      setRunning(false);
      return;
    }
    endRef.current = Date.now() + left * 1000;
    setNote('');
    setRunning(true);
    scheduleAlert(left, mode);
  }

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        cancelAlert();
        setRunning(false);
        buzz('success');
        if (mode === 'foco') {
          const n = count + 1;
          const next: Mode = n % 4 === 0 ? 'largo' : 'corto';
          setCount(n);
          setMode(next);
          setLeft(MODES[next].secs);
          setNote('Foco completado. Toca descansar.');
        } else {
          setMode('foco');
          setLeft(MODES.foco.secs);
          setNote('Descanso terminado. Listo para otro foco.');
        }
      }
    }, 500);
    return () => clearInterval(id);
  }, [running, mode, count]);

  const tint = mode === 'foco' ? c.accent : c.good;
  const remaining = Math.min(1, Math.max(0, left / MODES[mode].secs));

  // El anillo ocupa todo el espacio libre de la pantalla
  const size = Math.max(0, Math.min(area.w, area.h) - 8);
  const stroke = Math.max(10, Math.round(size * 0.045));
  const rad = (size - stroke) / 2;
  const circ = 2 * Math.PI * rad;

  // Puntos del ciclo: se llenan hasta el descanso largo
  const cycle = count % 4;
  const dots = cycle === 0 && count > 0 && mode !== 'foco' ? 4 : cycle;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.body}>
        <Text style={styles.title}>Pomodoro</Text>
        <Text style={styles.subtitle}>
          {note || (mode === 'foco' ? 'Tiempo de concentrarte' : 'Tiempo de descansar')}
        </Text>

        <Segmented options={ORDER} value={mode} onChange={choose} label={(m) => SHORT[m]} />

        <View
          style={styles.stage}
          onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        >
          {size > 0 ? (
            <View style={{ width: size, height: size }}>
              <Svg width={size} height={size}>
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={rad}
                  stroke={c.fill}
                  strokeWidth={stroke}
                  fill="none"
                />
                {remaining > 0.002 ? (
                  <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={rad}
                    stroke={tint}
                    strokeWidth={stroke}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${circ} ${circ}`}
                    strokeDashoffset={circ * (1 - remaining)}
                    rotation={-90}
                    origin={`${size / 2}, ${size / 2}`}
                  />
                ) : null}
              </Svg>
              <View style={[StyleSheet.absoluteFill, styles.center]}>
                <Text style={styles.modeLabel}>{NAME[mode]}</Text>
                <Text
                  style={[styles.clock, { fontSize: Math.round(size * 0.26), width: size * 0.8 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  accessibilityRole="timer"
                >
                  {mmss(left)}
                </Text>
                <View style={styles.dots}>
                  {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={[styles.dot, i < dots && { backgroundColor: c.accent }]} />
                  ))}
                </View>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.buttons}>
          <PressableScale
            style={[styles.primary, { backgroundColor: running ? c.fill : tint }]}
            onPress={toggle}
          >
            <Text style={[styles.primaryText, { color: running ? c.text : mode === 'foco' ? c.onAccent : c.card }]}>
              {running ? 'Pausar' : 'Empezar'}
            </Text>
          </PressableScale>
          <PressableScale
            style={styles.secondary}
            onPress={() => {
              buzz('light');
              choose(mode);
            }}
          >
            <Text style={styles.secondaryText}>Reiniciar</Text>
          </PressableScale>
        </View>

        <Text style={styles.meta}>Focos completados: {count}. Cada 4 focos toca un descanso largo.</Text>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    body: { flex: 1, paddingHorizontal: space.l, paddingTop: space.s, paddingBottom: TAB_PAD, width: '100%', maxWidth: 640, alignSelf: 'center' },
    title: { ...font.largeTitle, color: c.text },
    subtitle: { ...font.body, color: c.sub, marginTop: 2, marginBottom: space.l },
    stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    center: { alignItems: 'center', justifyContent: 'center' },
    modeLabel: { ...font.headline, color: c.sub, marginBottom: 4 },
    clock: {
      fontWeight: '200',
      letterSpacing: -2,
      color: c.text,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    dots: { flexDirection: 'row', gap: 8, marginTop: space.m },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.fill },
    buttons: { flexDirection: 'row', gap: space.m, marginTop: space.s },
    primary: { flex: 2, borderRadius: 999, paddingVertical: 18, alignItems: 'center' },
    primaryText: { ...font.headline },
    secondary: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 18,
      alignItems: 'center',
      backgroundColor: c.fill,
    },
    secondaryText: { ...font.headline, color: c.text },
    meta: { ...font.caption, color: c.sub, textAlign: 'center', marginTop: space.m },
  });