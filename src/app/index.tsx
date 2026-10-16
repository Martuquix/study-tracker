import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScheduleButton } from '../horario-editor';
import { ymd } from '../planner';
import { useStore, type Task } from '../store';
import { useTaskSheet } from '../task-sheet';
import { font, NARROW, radius, space, subjectColor, TAB_PAD, useTheme, type Theme } from '../theme';
import { animateLayout, buzz, PressableScale } from '../ui';

// Convierte "2026-11-20" a "20-11-2026" para mostrarla
function show(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

export default function Bandeja() {
  const c = useTheme();
  const styles = makeStyles(c);
  const { tasks, update } = useStore();
  const { open } = useTaskSheet();
  const [showDone, setShowDone] = useState(false);

  const today = ymd(new Date());
  const pending = tasks.filter((t) => !t.done).sort((a, b) => a.date.localeCompare(b.date));
  const finished = tasks.filter((t) => t.done).sort((a, b) => b.date.localeCompare(a.date));

  function removeTask(id: string) {
    animateLayout();
    buzz('light');
    update({ tasks: tasks.filter((t) => t.id !== id) });
  }

  function toggleDone(id: string, wasDone: boolean) {
    animateLayout();
    buzz(wasDone ? 'light' : 'success');
    update({ tasks: tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) });
  }

  const row = (t: Task) => {
    const late = !t.done && t.date < today;
    return (
      <View key={t.id} style={styles.row}>
        <View style={[styles.bar, { backgroundColor: subjectColor(t.subject) }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, t.done && styles.done]}>{t.name}</Text>
          <Text style={[styles.rowMeta, late && styles.late]}>
            {t.subject} · {t.type === 'examen' ? 'Examen' : 'Deberes'} · {show(t.date)}
            {late ? ' · vencida' : ''}
          </Text>
          <Text style={styles.rowMeta}>
            Dificultad {t.diff}/5 · Necesidad {t.need}/5
          </Text>
        </View>
        <View style={styles.actions}>
          <PressableScale style={styles.pill} onPress={() => toggleDone(t.id, !!t.done)}>
            <Text style={styles.pillText}>{t.done ? 'Reabrir' : 'Hecha'}</Text>
          </PressableScale>
          {!t.done ? (
            <PressableScale style={styles.pillNeutral} haptic="light" onPress={() => open(t)}>
              <Text style={styles.pillNeutralText}>Editar</Text>
            </PressableScale>
          ) : null}
          <PressableScale style={styles.pillDanger} onPress={() => removeTask(t.id)}>
            <Text style={styles.pillDangerText}>Borrar</Text>
          </PressableScale>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Bandeja</Text>
        <Text style={styles.subtitle}>
          {pending.length === 0 ? 'Nada pendiente' : pending.length === 1 ? '1 pendiente' : `${pending.length} pendientes`}
        </Text>

        <ScheduleButton />

        {pending.length === 0 ? (
          <Text style={styles.empty}>
            {finished.length === 0
              ? 'Aún no tienes tareas. Pulsa el botón + para añadir la primera.'
              : 'No te queda nada pendiente. Pulsa el botón + para añadir otra tarea.'}
          </Text>
        ) : (
          pending.map(row)
        )}

        {finished.length > 0 ? (
          <>
            <PressableScale
              style={styles.doneHead}
              haptic="select"
              onPress={() => {
                animateLayout();
                setShowDone(!showDone);
              }}
            >
              <Text style={styles.section}>Hechas ({finished.length})</Text>
              <Text style={styles.toggle}>{showDone ? 'Ocultar' : 'Mostrar'}</Text>
            </PressableScale>
            {showDone ? finished.map(row) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: space.l, paddingTop: space.s, paddingBottom: TAB_PAD, width: '100%', maxWidth: NARROW, alignSelf: 'center' },
    title: { ...font.largeTitle, color: c.text },
    subtitle: { ...font.body, color: c.sub, marginTop: 2, marginBottom: space.l },
    empty: { ...font.body, color: c.sub, textAlign: 'center', marginTop: space.xl },
    section: { ...font.title, color: c.text },
    doneHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space.l,
      marginBottom: space.m,
    },
    toggle: { ...font.caption, color: c.accentText, fontWeight: '700' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.m,
      backgroundColor: c.card,
      borderRadius: radius.m,
      padding: space.l,
      marginBottom: 10,
      ...c.shadow,
    },
    bar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
    rowTitle: { ...font.headline, color: c.text },
    done: { textDecorationLine: 'line-through', color: c.sub },
    rowMeta: { ...font.caption, color: c.sub, marginTop: 2 },
    late: { color: c.danger },
    actions: { gap: 6, alignItems: 'flex-end' },
    pill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.accentSoft },
    pillText: { ...font.caption, color: c.accentText, fontWeight: '700' },
    pillNeutral: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.fill },
    pillNeutralText: { ...font.caption, color: c.text, fontWeight: '700' },
    pillDanger: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.dangerSoft },
    pillDangerText: { ...font.caption, color: c.danger, fontWeight: '700' },
  });