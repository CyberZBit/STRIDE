import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { colors } from './theme';

const symbols = {
  home: 'house.fill',
  history: 'clock.arrow.circlepath',
  records: 'trophy.fill',
  settings: 'gearshape.fill',
  calendar: 'calendar',
  walk: 'figure.walk',
  arrow: 'arrow.right',
  shield: 'lock.shield',
} as const satisfies Record<string, SymbolViewProps['name']>;

export type IconName = keyof typeof symbols;

export function Icon({ name, size = 20, color = colors.muted }: {
  name: IconName;
  size?: number;
  color?: SymbolViewProps['tintColor'];
}) {
  return <SymbolView name={symbols[name]} size={size} tintColor={color} />;
}
