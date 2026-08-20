import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SessionsStackParamList } from '../../navigation/types';
import { logNoPhotoCatch } from '../../services/catches';

type Props = NativeStackScreenProps<SessionsStackParamList, 'LogCatches'>;

type FishEntry = { species: string; sizeInches: string };

function makeEntries(count: number): FishEntry[] {
  return Array.from({ length: count }, () => ({ species: '', sizeInches: '' }));
}

export function LogCatchesScreen({ route, navigation }: Props) {
  const { visitId, sessionId } = route.params;
  const [countText, setCountText] = useState('');
  const [entries, setEntries] = useState<FishEntry[]>([]);
  const [saving, setSaving] = useState(false);

  function handleCountChange(text: string) {
    setCountText(text);
    const count = Number(text);
    if (Number.isInteger(count) && count >= 0 && count <= 50) {
      setEntries(makeEntries(count));
    }
  }

  function updateEntry(index: number, field: keyof FishEntry, value: string) {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  }

  async function handleSave() {
    setSaving(true);
    try {
      for (const entry of entries) {
        const sizeInches = entry.sizeInches.trim().length > 0 ? Number(entry.sizeInches) : null;
        await logNoPhotoCatch({
          locationVisitId: visitId,
          species: entry.species.trim().length > 0 ? entry.species.trim() : null,
          sizeInches: sizeInches !== null && !Number.isNaN(sizeInches) ? sizeInches : null,
        });
      }
      navigation.navigate('ActiveSession', { sessionId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Any fish caught without a photo?</Text>
        <TextInput
          style={styles.input}
          value={countText}
          onChangeText={handleCountChange}
          placeholder="0"
          keyboardType="number-pad"
        />

        <Text style={styles.note}>
          Photo-based catch logging is coming in a later step — for now, only fish without a photo can be logged
          here.
        </Text>

        {entries.map((entry, index) => (
          <View key={index} style={styles.fishCard}>
            <Text style={styles.fishTitle}>Fish {index + 1}</Text>
            <Text style={styles.subLabel}>Species (optional)</Text>
            <TextInput
              style={styles.input}
              value={entry.species}
              onChangeText={(v) => updateEntry(index, 'species', v)}
              placeholder="e.g. Striped Bass"
              autoCapitalize="words"
            />
            <Text style={styles.subLabel}>Size in inches (optional)</Text>
            <TextInput
              style={styles.input}
              value={entry.sizeInches}
              onChangeText={(v) => updateEntry(index, 'sizeInches', v)}
              placeholder="e.g. 28"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        ))}

        <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : entries.length > 0 ? 'Save Catches' : 'Done'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 15, color: '#333', marginBottom: 6 },
  subLabel: { fontSize: 13, color: '#888', marginBottom: 4, marginTop: 10 },
  note: { fontSize: 13, color: '#888', marginTop: 12, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  fishCard: {
    marginTop: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  fishTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  saveButton: {
    backgroundColor: '#1c6e57',
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
