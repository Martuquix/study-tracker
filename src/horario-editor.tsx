import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HOURS } from './planner';
import { useStore } from './store';
import { font, radius, space, useTheme, type Theme } from './theme';
import { buzz, PressableScale } from './ui';

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function Editor({ onClose }: { onClose: () => void }) {
  const c = useTheme();
  const styles = makeStyles(c);
  const { free, max, update } = useStore();
  const total = Object.values(free).filter(Boolean).length;

  function toggle(key: string) {
    buzz('select');
    const next = { ...free };
    if (next[key]) delete next[key];
    else next[key] = true;
    update({ free: next });
  }

  function setMax(v: number) {
    buzz('select');
    update({ max: Math.min(14, Math.max(1, v)) });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Horario</Text>
        <PressableScale style={styles.done} haptic="light" onPress={onClose}>
          <Text style={styles.doneText}>Listo</Text>
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Marca las horas en las que puedes estudiar. Lo que dejes sin marcar cuenta como ocupado.
        </Text>

        <View style={styles.card}>
          <View style={styles.stepRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Máximo al día</Text>
              <Text style={styles.hint}>Horas de estudio como mucho cada día</Text>
            </View>
            <PressableScale style={styles.stepBtn} onPress={() => setMax(max - 1)} accessibilityLabel="Menos horas">
              <Text style={styles.stepText}>−</Text>
            </PressableScale>
            <Text style={styles.stepVal}>{max}</Text>
            <PressableScale style={styles.stepBtn} onPress={() => setMax(max + 1)} accessibilityLabel="Más horas">
              <Text style={styles.stepText}>+</Text>
            </PressableScale>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.totalRow}>
            <Text style={styles.total}>{total}</Text>
            <Text style={styles.hint}> h libres a la semana</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.hourSpacer} />
            {DAYS.map((d) => (
              <Text key={d} style={styles.dayHead}>
                {d}
              </Text>
            ))}
          </View>

          {HOURS.map((h) => (
            <View key={h} style={styles.row}>
              <Text style={styles.hour}>{h}:00</Text>
              {DAYS.map((d, i) => {
                const k = `${i}-${h}`;
                const on = !!free[k];
                return (
                  <Pressable
                    key={k}
                    accessibilityRole="button"
                    accessibilityLabel={`${d} ${h}:00`}
                    accessibilityState={{ selected: on }}
                    onPress={() => toggle(k)}
                    style={({ pressed }) => [styles.cell, on && styles.cellOn, pressed && styles.cellPressed]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// Fila que se coloca en la pantalla de Tareas y abre la hoja del horario
export function ScheduleButton() {
  const c = useTheme();
  const styles = makeStyles(c);
  const { free, max } = useStore();
  const [open, setOpen] = useState(false);
  const total = Object.values(free).filter(Boolean).length;

  return (
    <>
      <PressableScale style={styles.entry} haptic="light" onPress={() => setOpen(true)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.entryTitle}>Horario</Text>
          <Text style={styles.entryMeta}>
            {total} h libres a la semana · máx. {max} al día
          </Text>
        </View>
        <Text style={styles.entryAction}>Editar horario</Text>
      </PressableScale>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
        onDismiss={() => setOpen(false)}
      >
        <Editor onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

const makeStyles = (c: Theme) =>
  StyleSheet.create({
    entry: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.m,
      backgroundColor: c.card,
      borderRadius: radius.m,
      padding: space.l,
      marginBottom: space.l,
      ...c.shadow,
    },
    entryTitle: { ...font.headline, color: c.text },
    entryMeta: { ...font.caption, color: c.sub, marginTop: 2 },
    entryAction: { ...font.caption, color: c.accentText, fontWeight: '700' },

    screen: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.l,
      paddingTop: space.xl,
      paddingBottom: space.s,
        width: '100%',
  maxWidth: 720,
  alignSelf: 'center',
    },
    title: { ...font.largeTitle, color: c.text },
    done: { backgroundColor: c.accent, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 18 },
    doneText: { ...font.headline, fontSize: 15, color: c.onAccent },
    content: { paddingHorizontal: space.l, paddingBottom: 48, width: '100%', maxWidth: 720, alignSelf: 'center' },
    subtitle: { ...font.body, color: c.sub, marginBottom: space.l },
    card: {
      backgroundColor: c.card,
      borderRadius: radius.l,
      padding: space.l,
      marginBottom: space.l,
      ...c.shadow,
    },
    hint: { ...font.caption, color: c.sub },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
    stepTitle: { ...font.headline, color: c.text },
    stepBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.fill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepText: { fontSize: 22, fontWeight: '500', color: c.text, lineHeight: 26 },
    stepVal: {
      ...font.title,
      color: c.text,
      minWidth: 28,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    totalRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: space.m },
    total: { ...font.largeTitle, color: c.text, fontVariant: ['tabular-nums'] },
    row: { flexDirection: 'row', alignItems: 'center' },
    hourSpacer: { width: 40 },
    hour: { width: 40, ...font.caption, fontSize: 11, color: c.sub },
    dayHead: { flex: 1, textAlign: 'center', ...font.caption, color: c.sub, marginBottom: 4 },
    cell: { flex: 1, height: 32, margin: 2, borderRadius: 8, backgroundColor: c.fill },
    cellOn: { backgroundColor: c.accent },
    cellPressed: { opacity: 0.55 },
  });