import * as Haptics from 'expo-haptics';
import { ReactNode, useEffect, useState } from 'react';
import {
    AccessibilityInfo,
    Animated,
    LayoutAnimation,
    Pressable,
    Text,
    View,
    type PressableProps,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import { font, radius, useTheme } from './theme';

// Si el usuario activa "Reducir movimiento" en Accesibilidad, se omiten las animaciones
let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => {
    reduceMotion = v;
  })
  .catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
  reduceMotion = v;
});

export type Haptic = 'light' | 'select' | 'success' | 'warning';

export function buzz(kind: Haptic) {
  try {
    if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (kind === 'select') Haptics.selectionAsync();
    else if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {}
}

// Animación de listas: los elementos se recolocan con un resorte sin rebote
export function animateLayout() {
  if (reduceMotion) return;
  LayoutAnimation.configureNext({
    duration: 320,
    create: { type: 'easeInEaseOut', property: 'opacity' },
    update: { type: 'spring', springDamping: 1 },
    delete: { type: 'easeInEaseOut', property: 'opacity' },
  });
}

// Resorte críticamente amortiguado: llega al destino sin rebotar
const SPRING = { stiffness: 420, damping: 41, mass: 1, useNativeDriver: true } as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PSProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: Haptic;
  children?: ReactNode;
};

// Botón que reacciona al tocar (no al soltar) y vuelve con un resorte
export function PressableScale({ children, style, scaleTo = 0.97, haptic, onPress, onPressIn, onPressOut, ...rest }: PSProps) {
  const [v] = useState(() => new Animated.Value(1));
  const go = (to: number) => Animated.spring(v, { toValue: to, ...SPRING }).start();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      onPressIn={(e) => {
        if (!reduceMotion && !rest.disabled) go(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        go(1);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) buzz(haptic);
        onPress?.(e);
      }}
      style={[style, { transform: [{ scale: v }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

// Selector segmentado con un indicador que se desliza hasta la opción elegida
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label?: (v: T) => string;
}) {
  const c = useTheme();
  const [w, setW] = useState(0);
  const [x] = useState(() => new Animated.Value(0));
  const n = options.length;
  const seg = w > 0 ? (w - 4) / n : 0;
  const idx = Math.max(0, options.indexOf(value));

  useEffect(() => {
    if (!seg) return;
    if (reduceMotion) x.setValue(idx * seg);
    else Animated.spring(x, { toValue: idx * seg, ...SPRING }).start();
  }, [idx, seg, x]);

  return (
    <View
      style={{ flexDirection: 'row', backgroundColor: c.fill, borderRadius: radius.s, padding: 2 }}
      onLayout={(e) => {
        const width = e.nativeEvent.layout.width;
        x.setValue(idx * ((width - 4) / n)); // la primera vez no se desliza desde la izquierda
        setW(width);
      }}
    >
      {seg > 0 ? (
        <Animated.View
          style={{
            position: 'absolute',
            top: 2,
            bottom: 2,
            left: 2,
            width: seg,
            borderRadius: radius.s - 2,
            backgroundColor: c.thumb,
            shadowColor: '#000',
            shadowOpacity: c.dark ? 0 : 0.12,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            transform: [{ translateX: x }],
          }}
        />
      ) : null}
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable
            key={String(o)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9 }}
            onPress={() => {
              if (on) return;
              buzz('select');
              onChange(o);
            }}
          >
            <Text style={[font.caption, { color: on ? c.text : c.sub, fontWeight: on ? '700' : '500' }]}>
              {label ? label(o) : String(o)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}