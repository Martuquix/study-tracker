import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { generate, type Session, type Task } from './planner';

export type { Session, Task } from './planner';

type Data = {
  tasks: Task[];
  free: Record<string, boolean>; // clave "día-hora", día 0 = lunes
  max: number; // máximo de horas de estudio al día
  sessions: Session[];
  warn: string[];
};

const KEY = 'studytracker.v1';

function defaultFree() {
  const free: Record<string, boolean> = {};
  for (let d = 0; d < 7; d++) {
    for (let h = 8; h < 22; h++) {
      const weekday = d < 5;
      if ((weekday && h >= 17 && h < 20) || (!weekday && ((h >= 10 && h < 13) || (h >= 16 && h < 19)))) {
        free[`${d}-${h}`] = true;
      }
    }
  }
  return free;
}

const initial: Data = { tasks: [], free: defaultFree(), max: 3, sessions: [], warn: [] };

type Ctx = Data & { loaded: boolean; update: (patch: Partial<Data>) => void };

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(initial);
  const [loaded, setLoaded] = useState(false);

  // Al arrancar, lee lo guardado y recalcula el plan con la fecha de hoy
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          const merged: Data = { ...initial, ...JSON.parse(raw) };
          setData({ ...merged, ...generate(merged) });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Cada vez que cambian los datos, los guarda
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
  }, [data, loaded]);

  const update = (patch: Partial<Data>) =>
    setData((d) => {
      const next = { ...d, ...patch };
      if ('tasks' in patch || 'free' in patch || 'max' in patch) {
        const r = generate(next);
        next.sessions = r.sessions;
        next.warn = r.warn;
      }
      return next;
    });

  return <StoreContext.Provider value={{ ...data, loaded, update }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const c = useContext(StoreContext);
  if (!c) throw new Error('useStore debe usarse dentro de StoreProvider');
  return c;
}