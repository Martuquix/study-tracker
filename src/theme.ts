import { StyleSheet, useColorScheme, type ViewStyle } from 'react-native';

export type Theme = {
  dark: boolean;
  bg: string;
  card: string;
  fill: string;
  thumb: string;
  text: string;
  sub: string;
  line: string;
  accent: string;
  accentText: string; // acento para texto pequeño: más oscuro para que se lea
  accentSoft: string;
  onAccent: string;
  danger: string;
  dangerSoft: string;
  good: string;
  today: string;
  glass: string; // tinte del cristal de la barra de pestañas
  shadow: ViewStyle;
};

// ============================ ELIGE AQUÍ ============================
// 'calida' = crema, chocolate y arena   |   'denim' = gris carbón y azul denim
const PALETA: 'calida' | 'denim' = 'calida';

// true = la app siempre se ve en modo claro; false = sigue el modo del iPhone
const FORCE_LIGHT = true;
// ====================================================================

// ---------- Paleta cálida: #FAF6F0 / #4A3E3D / #D4A373 ----------
const calidaLight: Theme = {
  dark: false,
  bg: '#FAF6F0', // 60 %: fondo
  card: '#FFFDF9',
  fill: '#F1EAE0',
  thumb: '#FFFFFF',
  text: '#4A3E3D', // 30 %: texto
  sub: '#736562',
  line: 'rgba(74,62,61,0.10)',
  accent: '#D4A373', // 10 %: acento
  accentText: '#8A5A2B',
  accentSoft: 'rgba(212,163,115,0.22)',
  onAccent: '#4A3E3D',
  danger: '#B3261E',
  dangerSoft: 'rgba(179,38,30,0.10)',
  good: '#4A3E3D',
  today: '#D4A373',
  glass: 'rgba(255,253,249,0.6)',
  shadow: {
    shadowColor: '#4A3E3D',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(74,62,61,0.10)',
  },
};

const calidaDark: Theme = {
  dark: true,
  bg: '#2A2321',
  card: '#4A3E3D', // contenedores: tu chocolate
  fill: '#5C4F4D',
  thumb: '#6E605D',
  text: '#FAF6F0',
  sub: '#CDBFB8',
  line: 'rgba(250,246,240,0.12)',
  accent: '#D4A373',
  accentText: '#E3BC91',
  accentSoft: 'rgba(212,163,115,0.20)',
  onAccent: '#2A2321',
  danger: '#F4A79D',
  dangerSoft: 'rgba(244,167,157,0.18)',
  good: '#D9CCC3',
  today: '#D4A373',
  glass: 'rgba(74,62,61,0.6)',
  shadow: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(250,246,240,0.12)' },
};

// ---------- Paleta denim: #F8F9FA / #2D3748 / #5A72A6 ----------
const denimLight: Theme = {
  dark: false,
  bg: '#F8F9FA',
  card: '#FFFFFF',
  fill: '#EDEFF2',
  thumb: '#FFFFFF',
  text: '#2D3748',
  sub: '#5F6B7E',
  line: 'rgba(45,55,72,0.10)',
  accent: '#5A72A6',
  accentText: '#5A72A6',
  accentSoft: 'rgba(90,114,166,0.14)',
  onAccent: '#FFFFFF',
  danger: '#D92D20',
  dangerSoft: 'rgba(217,45,32,0.10)',
  good: '#2D3748',
  today: '#5A72A6',
  glass: 'rgba(255,255,255,0.6)',
  shadow: {
    shadowColor: '#2D3748',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(45,55,72,0.10)',
  },
};

const denimDark: Theme = {
  dark: true,
  bg: '#1A202C',
  card: '#2D3748',
  fill: '#3D4656',
  thumb: '#4D5769',
  text: '#F8F9FA',
  sub: '#A0AEC0',
  line: 'rgba(248,249,250,0.10)',
  accent: '#94A3C5',
  accentText: '#94A3C5',
  accentSoft: 'rgba(148,163,197,0.18)',
  onAccent: '#1A202C',
  danger: '#FC8181',
  dangerSoft: 'rgba(252,129,129,0.16)',
  good: '#CBD5E0',
  today: '#94A3C5',
  glass: 'rgba(45,55,72,0.6)',
  shadow: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(248,249,250,0.10)' },
};

const PALETTES = {
  calida: { light: calidaLight, dark: calidaDark },
  denim: { light: denimLight, dark: denimDark },
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const p = PALETTES[PALETA];
  return !FORCE_LIGHT && scheme === 'dark' ? p.dark : p.light;
}

// El tracking se aprieta en tamaños grandes y se abre un poco en los pequeños
export const font = {
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: -0.8, lineHeight: 40 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4, lineHeight: 28 },
  headline: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2, lineHeight: 22 },
  body: { fontSize: 16, fontWeight: '400', letterSpacing: -0.1, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '500', letterSpacing: 0.1, lineHeight: 18 },
} as const;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24 } as const;
export const radius = { s: 12, m: 16, l: 22 } as const;

// Espacio inferior para que el contenido no quede tapado por la barra de pestañas
export const TAB_PAD = 110;
export const MAX_W = 1200; // ancho máximo de la app en pantallas grandes
export const NARROW = 720; // ancho máximo de las pantallas de lectura
const PAL_VIVID = ['#3A5BFF', '#E4572E', '#17A398', '#B5179E', '#E09F00', '#5C8A00', '#8A4FFF', '#D1495B'];
const PAL_MUTED = ['#4F7C8C', '#B5694F', '#5E8C73', '#8A6A9E', '#A8823F', '#6F8244', '#7A67A8', '#A85A6E'];

// true = colores apagados; false = los vivos de antes
const MUTED = false;
const PAL = MUTED ? PAL_MUTED : PAL_VIVID;

// Cada asignatura recibe siempre el mismo color
export function subjectColor(s: string) {
  let h = 0;
  const low = s.toLowerCase();
  for (let i = 0; i < low.length; i++) h = (h * 31 + low.charCodeAt(i)) >>> 0;
  return PAL[h % PAL.length];
}