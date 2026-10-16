import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from './theme';

export function DateField({ value, onChange, min }: { value: Date; onChange: (d: Date) => void; min?: Date }) {
  const c = useTheme();
  return (
    <DateTimePicker
      value={value}
      mode="date"
      display="compact"
      minimumDate={min}
      locale="es-ES"
      themeVariant={c.dark ? 'dark' : 'light'}
      onChange={(_, d) => {
        if (d) onChange(d);
      }}
    />
  );
}