import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SessionsStackParamList } from '../../navigation/types';
import type {
  CloudCoverBucket,
  PressureTrendBucket,
  Spot,
  TideStageBucket,
  VisitOutcome,
  WindDirectionBucket,
} from '../../types/models';
import { getCachedSpots, subscribeToActiveSpots } from '../../services/spots';
import { logLocationVisit } from '../../services/locationVisits';

type Props = NativeStackScreenProps<SessionsStackParamList, 'LogVisit'>;

const TIDE_OPTIONS: TideStageBucket[] = ['low', 'rising', 'high', 'falling'];
const WIND_DIRECTION_OPTIONS: WindDirectionBucket[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const CLOUD_COVER_OPTIONS: CloudCoverBucket[] = ['clear', 'partly_cloudy', 'overcast'];
const PRESSURE_OPTIONS: PressureTrendBucket[] = ['rising', 'falling', 'steady'];
const OUTCOME_OPTIONS: VisitOutcome[] = ['skunked', 'caught'];

function labelFor(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.choiceRow}>
      {options.map((option) => (
        <Pressable
          key={option}
          style={[styles.choice, value === option && styles.choiceSelected]}
          onPress={() => onChange(option)}
        >
          <Text style={[styles.choiceText, value === option && styles.choiceTextSelected]}>{labelFor(option)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function LogVisitScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;

  const [spots, setSpots] = useState<Spot[]>([]);
  const [spotId, setSpotId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<VisitOutcome | null>(null);
  const [tideStageBucket, setTideStageBucket] = useState<TideStageBucket | null>(null);
  const [windDirectionBucket, setWindDirectionBucket] = useState<WindDirectionBucket | null>(null);
  const [windSpeedMph, setWindSpeedMph] = useState('');
  const [temperatureFahrenheit, setTemperatureFahrenheit] = useState('');
  const [cloudCoverBucket, setCloudCoverBucket] = useState<CloudCoverBucket | null>(null);
  const [pressureTrendBucket, setPressureTrendBucket] = useState<PressureTrendBucket | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCachedSpots().then(setSpots);
    const unsubscribe = subscribeToActiveSpots(setSpots);
    return unsubscribe;
  }, []);

  const missingFields = [
    spotId === null && 'Spot',
    outcome === null && 'Outcome',
    tideStageBucket === null && 'Tide',
    windDirectionBucket === null && 'Wind Direction',
    windSpeedMph.trim().length === 0 && 'Wind Speed',
    temperatureFahrenheit.trim().length === 0 && 'Temperature',
    cloudCoverBucket === null && 'Cloud Cover',
    pressureTrendBucket === null && 'Pressure Trend',
  ].filter((v): v is string => typeof v === 'string');

  const canSave = missingFields.length === 0;

  async function handleSave() {
    const windSpeed = Number(windSpeedMph);
    const temp = Number(temperatureFahrenheit);
    if (Number.isNaN(windSpeed) || Number.isNaN(temp)) {
      Alert.alert('Invalid input', 'Wind speed and temperature must be numbers.');
      return;
    }
    if (!spotId || !outcome || !tideStageBucket || !windDirectionBucket || !cloudCoverBucket || !pressureTrendBucket) {
      return;
    }

    setSaving(true);
    try {
      const visit = await logLocationVisit({
        sessionId,
        spotId,
        outcome,
        conditions: {
          tideStageBucket,
          windDirectionBucket,
          windSpeedMph: windSpeed,
          temperatureFahrenheit: temp,
          cloudCoverBucket,
          pressureTrendBucket,
        },
      });
      if (visit.outcome === 'caught') {
        navigation.replace('LogCatches', { visitId: visit.id, sessionId });
      } else {
        navigation.goBack();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Spot</Text>
        {spots.length === 0 ? (
          <Text style={styles.placeholder}>No spots saved yet — add one on the Spots tab first.</Text>
        ) : (
          <View style={styles.choiceRow}>
            {spots.map((spot) => (
              <Pressable
                key={spot.id}
                style={[styles.choice, spotId === spot.id && styles.choiceSelected]}
                onPress={() => setSpotId(spot.id)}
              >
                <Text style={[styles.choiceText, spotId === spot.id && styles.choiceTextSelected]}>{spot.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.label}>Outcome</Text>
        <ChoiceRow options={OUTCOME_OPTIONS} value={outcome} onChange={setOutcome} />

        <Text style={styles.label}>Tide</Text>
        <ChoiceRow options={TIDE_OPTIONS} value={tideStageBucket} onChange={setTideStageBucket} />

        <Text style={styles.label}>Wind Direction</Text>
        <ChoiceRow options={WIND_DIRECTION_OPTIONS} value={windDirectionBucket} onChange={setWindDirectionBucket} />

        <Text style={styles.label}>Wind Speed (mph)</Text>
        <TextInput
          style={styles.input}
          value={windSpeedMph}
          onChangeText={setWindSpeedMph}
          placeholder="e.g. 12"
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>Temperature (°F)</Text>
        <TextInput
          style={styles.input}
          value={temperatureFahrenheit}
          onChangeText={setTemperatureFahrenheit}
          placeholder="e.g. 62"
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>Cloud Cover</Text>
        <ChoiceRow options={CLOUD_COVER_OPTIONS} value={cloudCoverBucket} onChange={setCloudCoverBucket} />

        <Text style={styles.label}>Pressure Trend</Text>
        <ChoiceRow options={PRESSURE_OPTIONS} value={pressureTrendBucket} onChange={setPressureTrendBucket} />

        {missingFields.length > 0 && (
          <Text style={styles.missing}>Still needed: {missingFields.join(', ')}</Text>
        )}

        <Pressable
          style={[styles.saveButton, (!canSave || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Visit'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  placeholder: { fontSize: 14, color: '#888' },
  label: { fontSize: 14, color: '#555', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  choiceSelected: { backgroundColor: '#1c6e57', borderColor: '#1c6e57' },
  choiceText: { fontSize: 14, color: '#333' },
  choiceTextSelected: { color: 'white', fontWeight: '600' },
  missing: { fontSize: 13, color: '#c0392b', marginTop: 16 },
  saveButton: {
    backgroundColor: '#1c6e57',
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
