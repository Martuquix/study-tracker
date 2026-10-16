import { createContext, useContext, useState, type ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DateField } from './date-field';
import { parse, ymd } from './planner';
import { useStore, type Task } from './store';
import { font, radius, space, useTheme, type Theme } from './theme';
import { animateLayout, buzz, PressableScale, Segmented } from './ui';

type Ctx = { open: (task?: Task) => void };
const SheetContext = createContext<Ctx | null>(null);

export function useTaskSheet(): Ctx {
  const c = useContext(SheetContext);
  if (!c) throw new Error('useTaskSheet debe usarse dentro de TaskSheetProvider');
  return c;
}

function TaskForm({ editing, onClose }: { editing?: Task; onClose: () => void }) {
  const c = useTheme();
  const styles = makeStyles(c);
  const { tasks, sessions, update } = useStore();
  const [name, setName] = useState(editing?.name ?? '');
  const [subject, setSubject] = useState(editing?.subject ?? '');
  const [type, setType] = useState<'examen' | 'deberes'>(editing?.type ?? 'examen');
  const [date, setDate] = useState(editing ? parse(editing.date) : new Date());
  const [diff, setDiff] = useState(editing?.diff ?? 3);
  const [need, setNeed] = useState(editing?.need ?? 3);
  const [error, setError] = useState('');
  const today = ymd(new Date());

  function submit() {
    const iso = ymd(date);
    if (!name.trim()) {
      setError('Escribe un nombre.');
      buzz('warning');
      return;
    }
    // Una tarea vencida se puede editar sin tocar su fecha
    if (iso < today && !(editing && editing.date === iso)) {
      setError('La fecha ya ha pasado. Elige una de hoy en adelante.');
      buzz('warning');
      return;
    }

    if (editing) {
      const changed =
        editing.date !== iso || editing.type !== type || editing.diff !== diff || editing.need !== need;
      animateLayout();
      update({
        tasks: tasks.map((t) =>
          t.id === editing.id
            ? { ...t, name: name.trim(), subject: subject.trim() || name.trim(), type, date: iso, diff, need }
            : t,
        ),
        // Si cambia algo que afecta al reparto, sus sesiones movidas vuelven al plan automático
        ...(changed ? { sessions: sessions.map((s) => (s.task === editing.id ? { ...s, pin: false } : s)) } : {}),
      });
    } else {
      const task: Task = {
        id: String(Date.now()),
        name: name.trim(),
        subject: subject.trim() || name.trim(),
        type,
        date: iso,
        diff,
        need,
      };
      animateLayout();
      update({ tasks: [...tasks, task] });
    }
    buzz('success');
    onClose();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{editing ? 'Editar tarea' : 'Nueva tarea'}</Text>
        <PressableScale style={styles.cancel} haptic="light" onPress={onClose}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </PressableScale>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.card}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Examen de Termodinámica"
            placeholderTextColor={c.sub}
          />

          <Text style={styles.label}>Asignatura</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="Termodinámica"
            placeholderTextColor={c.sub}
          />

          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Fecha</Text>
               <DateField value={date} onChange={setDate} min={editing ? undefined : new Date()} />
          </View>

          <Text style={styles.label}>Tipo</Text>
          <Segmented
            options={['examen', 'deberes'] as const}
            value={type}
            onChange={setType}
            label={(v) => (v === 'examen' ? 'Examen' : 'Deberes')}
          />

          <Text style={styles.label}>Dificultad</Text>
          <Segmented options={[1, 2, 3, 4, 5] as const} value={diff} onChange={setDiff} />
          <Text style={styles.hint}>1 fácil · 5 muy difícil</Text>

          <Text style={styles.label}>Necesidad</Text>
          <Segmented options={[1, 2, 3, 4, 5] as const} value={need} onChange={setNeed} />
          <Text style={styles.hint}>1 voy bien · 5 necesito mucho</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <PressableScale style={styles.button} onPress={submit}>
          <Text style={styles.buttonText}>{editing ? 'Guardar cambios' : 'Añadir tarea'}</Text>
        </PressableScale>
      </ScrollView>
    </View>
  );
}

// Envuelve la app: permite abrir la hoja de añadir o editar desde cualquier pantalla
export function TaskSheetProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Task | undefined>(undefined);
  const [n, setN] = useState(0);

  const open = (task?: Task) => {
    setEditing(task);
    setN((v) => v + 1); // fuerza un formulario nuevo cada vez que se abre
    setVisible(true);
  };
  const close = () => setVisible(false);

  return (
    <SheetContext.Provider value={{ open }}>
      {children}
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}
        onDismiss={close}
      >
        <TaskForm key={n} editing={editing} onClose={close} />
      </Modal>
    </SheetContext.Provider>
  );
}

const makeStyles = (c: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.l,
      paddingTop: space.xl,
      paddingBottom: space.s,
        width: '100%',
  maxWidth: 640,
  alignSelf: 'center',
    },
    title: { ...font.largeTitle, color: c.text },
    cancel: { backgroundColor: c.fill, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 18 },
    cancelText: { ...font.headline, fontSize: 15, color: c.text },
    content: { paddingHorizontal: space.l, paddingBottom: 48, width: '100%', maxWidth: 640, alignSelf: 'center' },
    card: {
      backgroundColor: c.card,
      borderRadius: radius.l,
      padding: space.l,
      marginBottom: space.l,
      ...c.shadow,
    },
    label: { ...font.caption, color: c.sub, marginTop: space.m, marginBottom: 6 },
    input: {
      backgroundColor: c.fill,
      borderRadius: radius.s,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: c.text,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space.m,
    },
    dateLabel: { ...font.headline, color: c.text },
    hint: { ...font.caption, color: c.sub, marginTop: 6 },
    error: { ...font.caption, color: c.danger, marginTop: space.m },
    button: {
      backgroundColor: c.accent,
      borderRadius: radius.m,
      paddingVertical: 15,
      alignItems: 'center',
    },
    buttonText: { ...font.headline, color: c.onAccent },
  });