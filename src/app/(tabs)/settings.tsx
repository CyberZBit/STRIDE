import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';
import { usePreferences } from '../../state/preferences';
import { ChoiceControl, EmptyState, Page, PageHeader, Panel, SectionHeading } from '../../ui/layout';
import { colors, fonts } from '../../ui/theme';

const choices = [
  { label: 'Kilometres', value: 'km' },
  { label: 'Miles', value: 'mi' },
] as const;

export default function Settings() {
  const { unit, busy, error, setUnit } = usePreferences();
  const version = Constants.expoConfig?.version;

  return (
    <Page>
      <PageHeader title="Settings" />
      <View style={styles.section}>
        <SectionHeading>Distance units</SectionHeading>
        <ChoiceControl
          label="Distance units"
          value={unit}
          choices={choices}
          disabled={busy}
          onChange={(next) => { void setUnit(next); }}
        />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.section}>
        <SectionHeading>Data</SectionHeading>
        <EmptyState icon="shield" title="On-device storage" description="Your sessions are stored on this iPhone." />
        <Panel>
          <View style={styles.info}>
            <Text style={styles.label}>Day and week boundaries</Text>
            <Text style={styles.detail}>Stockholm time. Weeks start on Monday.</Text>
          </View>
        </Panel>
      </View>

      {version ? (
        <View style={styles.section}>
          <SectionHeading>About</SectionHeading>
          <Panel>
            <View style={styles.info}>
              <Text style={styles.label}>STRIDE</Text>
              <Text style={styles.detail}>Version {version}</Text>
            </View>
          </Panel>
        </View>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  section: { gap: 11 },
  info: { padding: 17, gap: 5 },
  label: { color: colors.text, fontFamily: fonts.emphasis, fontSize: 15 },
  detail: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 14 },
});
