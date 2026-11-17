import { Tabs } from 'expo-router';
import { type IconName, Icon } from '../../ui/Icon';
import { colors, fonts } from '../../ui/theme';

const tabs = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'history', title: 'History', icon: 'history' },
  { name: 'records', title: 'Records', icon: 'records' },
  { name: 'settings', title: 'Settings', icon: 'settings' },
] as const satisfies readonly { name: string; title: string; icon: IconName }[];

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.muted,
      tabBarLabelStyle: { fontFamily: fonts.emphasis, fontSize: 11 },
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
    }}>
      {tabs.map(({ name, title, icon }) => (
        <Tabs.Screen key={name} name={name} options={{
          title,
          tabBarIcon: ({ color, size }) => <Icon name={icon} color={color} size={size} />,
        }} />
      ))}
    </Tabs>
  );
}
