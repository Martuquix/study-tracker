import { BlurView } from 'expo-blur';
import type { MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTaskSheet } from './task-sheet';
import { font, space, useTheme } from './theme';
import { buzz, PressableScale } from './ui';

const SPRING = { stiffness: 420, damping: 41, mass: 1, useNativeDriver: true } as const;
const H = 56; // alto de la barra y diámetro del botón +
const PAD = 4;

function Plus({ color }: { color: string }) {
  return (
    <View style={styles.plus}>
      <View style={[styles.plusH, { backgroundColor: color }]} />
      <View style={[styles.plusV, { backgroundColor: color }]} />
    </View>
  );
}

export function FloatingTabBar({ state, descriptors, navigation, position }: MaterialTopTabBarProps) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { open } = useTaskSheet();
  const [w, setW] = useState(0);
  const [fallback] = useState(() => new Animated.Value(state.index));
  const prev = useRef(state.index);

  // Vibración suave al cambiar de pestaña, ya sea tocando o deslizando
  useEffect(() => {
    Animated.spring(fallback, { toValue: state.index, ...SPRING }).start();
    if (prev.current !== state.index) {
      prev.current = state.index;
      buzz('select');
    }
  }, [state.index, fallback]);

  // Si el navegador da la posición del deslizado, el indicador sigue al dedo
  const pos = position ?? fallback;
  const n = state.routes.length;
  const seg = w > 0 ? (w - PAD * 2) / n : 0;
  const idx = state.routes.map((_, i) => i);
  const thumbX = pos.interpolate({
    inputRange: idx,
    outputRange: idx.map((i) => i * seg),
    extrapolate: 'clamp',
  });

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View pointerEvents="box-none" style={styles.row}>
        <View
          style={[styles.glass, { borderColor: c.line }]}
          onLayout={(e) => setW(e.nativeEvent.layout.width)}
        >
          <BlurView intensity={60} tint={c.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.glass }]} />

          {seg > 0 ? (
            <Animated.View
              style={[
                styles.thumb,
                { width: seg, backgroundColor: c.accent, transform: [{ translateX: thumbX }] },
              ]}
            />
          ) : null}

          <View style={styles.options}>
            {state.routes.map((route, i) => {
              const focused = state.index === i;
              const label = descriptors[route.key].options.title ?? route.name;
              const active = pos.interpolate({
                inputRange: [i - 1, i, i + 1],
                outputRange: [0, 1, 0],
                extrapolate: 'clamp',
              });
              const inactive = pos.interpolate({
                inputRange: [i - 1, i, i + 1],
                outputRange: [1, 0, 1],
                extrapolate: 'clamp',
              });
              return (
                <PressableScale
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: focused }}
                  scaleTo={0.96}
                  style={styles.option}
                  onPress={() => {
                    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                    if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                  }}
                  onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                >
                  <Animated.Text style={[styles.label, { color: c.text, opacity: inactive }]}>{label}</Animated.Text>
                  <Animated.Text style={[styles.label, styles.labelOn, { color: c.onAccent, opacity: active }]}>
                    {label}
                  </Animated.Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        <PressableScale
          style={[styles.fab, { backgroundColor: c.accent }]}
          scaleTo={0.92}
          haptic="light"
          accessibilityLabel="Añadir tarea"
          onPress={() => open()}
        >
          <Plus color={c.onAccent} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.l, alignItems: 'center',zIndex: 10, elevation: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', maxWidth: 560 },
  glass: { flex: 1, height: H, borderRadius: H / 2, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  thumb: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: (H - PAD * 2) / 2,
  },
  options: { flex: 1, flexDirection: 'row', padding: PAD },
  option: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { ...font.caption, fontSize: 14, fontWeight: '700' },
  labelOn: { position: 'absolute' },
  fab: {
    width: H,
    height: H,
    borderRadius: H / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  plus: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  plusH: { position: 'absolute', width: 22, height: 2.5, borderRadius: 2 },
  plusV: { position: 'absolute', width: 2.5, height: 22, borderRadius: 2 },
});