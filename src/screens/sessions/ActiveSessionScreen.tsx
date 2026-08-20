import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SessionsStackParamList } from '../../navigation/types';
import type { LocationVisit, Session } from '../../types/models';
import { endSession, getCachedSessions, subscribeToSessions } from '../../services/sessions';
import { getCachedVisitsForSession, subscribeToVisitsForSession } from '../../services/locationVisits';
import { formatMoonPhase } from '../../utils/moonPhase';

type Props = NativeStackScreenProps<SessionsStackParamList, 'ActiveSession'>;

export function ActiveSessionScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const [session, setSession] = useState<Session | null>(null);
  const [visits, setVisits] = useState<LocationVisit[]>([]);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    getCachedSessions().then((sessions) => {
      setSession(sessions.find((s) => s.id === sessionId) ?? null);
    });
    const unsubscribe = subscribeToSessions((sessions) => {
      setSession(sessions.find((s) => s.id === sessionId) ?? null);
    });
    return unsubscribe;
  }, [sessionId]);

  useEffect(() => {
    getCachedVisitsForSession(sessionId).then(setVisits);
    const unsubscribe = subscribeToVisitsForSession(sessionId, setVisits);
    return unsubscribe;
  }, [sessionId]);

  async function handleEndSession() {
    setEnding(true);
    try {
      await endSession(sessionId);
      navigation.navigate('SessionList');
    } finally {
      setEnding(false);
    }
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Loading session…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Started</Text>
      <Text style={styles.value}>{session.startedAt.toLocaleString()}</Text>

      <Text style={styles.label}>Moon Phase</Text>
      <Text style={styles.value}>{formatMoonPhase(session.moonPhaseBucket)}</Text>

      <Text style={styles.label}>Status</Text>
      <Text style={styles.value}>{session.endedAt ? `Ended ${session.endedAt.toLocaleString()}` : 'In progress'}</Text>

      <Text style={[styles.label, styles.visitsLabel]}>Locations Logged</Text>
      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        style={styles.visitsList}
        ListEmptyComponent={<Text style={styles.placeholder}>None yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.visitRow}>
            <Text style={styles.visitOutcome}>{item.outcome === 'caught' ? 'Caught' : 'Skunked'}</Text>
            <Text style={styles.visitMeta}>{item.arrivedAt.toLocaleTimeString()}</Text>
          </View>
        )}
      />

      {!session.endedAt && (
        <>
          <Pressable style={styles.logButton} onPress={() => navigation.navigate('LogVisit', { sessionId })}>
            <Text style={styles.logButtonText}>+ Log Location Visit</Text>
          </Pressable>
          <Pressable style={styles.endButton} onPress={handleEndSession} disabled={ending}>
            <Text style={styles.endButtonText}>{ending ? 'Ending…' : 'End Session'}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  placeholder: { fontSize: 16, color: '#888' },
  label: { fontSize: 13, color: '#888', marginTop: 16 },
  value: { fontSize: 18, fontWeight: '600', marginTop: 2 },
  visitsLabel: { marginTop: 24 },
  visitsList: { flexGrow: 0, maxHeight: 160, marginTop: 4 },
  visitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  visitOutcome: { fontSize: 15, fontWeight: '600' },
  visitMeta: { fontSize: 13, color: '#888' },
  logButton: {
    backgroundColor: '#2a7f9e',
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  endButton: {
    backgroundColor: '#c0392b',
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  endButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
