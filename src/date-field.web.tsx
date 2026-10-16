import { createElement } from 'react';
import { parse, ymd } from './planner';
import { useTheme } from './theme';

export function DateField({ value, onChange, min }: { value: Date; onChange: (d: Date) => void; min?: Date }) {
  const c = useTheme();
  return createElement('input', {
    type: 'date',
    value: ymd(value),
    min: min ? ymd(min) : undefined,
    onChange: (e: { target: { value: string } }) => {
      const v = e.target.value;
      if (v) onChange(parse(v));
    },
    style: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: 16,
      padding: '8px 12px',
      borderRadius: 12,
      border: 'none',
      backgroundColor: c.fill,
      color: c.text,
      colorScheme: c.dark ? 'dark' : 'light',
    },
  });
}