import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SessionsStackParamList } from '../../navigation/types';
import type { Session } from '../../types/models';
import { getCachedSessions, startSession, subscribeToSessions } from '../../services/sessions';
import { formatMoonPhase } from '../../utils/moonPhase';

type Props = NativeStackScreenProps<SessionsStackParamList, 'SessionList'>;

export function SessionListScreen({ navigation }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    getCachedSessions().then(setSessions);
    const unsubscribe = subscribeToSessions(setSessions);
    return unsubscribe;
  }, []);

  const activeSession = sessions.find((s) => s.endedAt === null);

  async function handleStartOrResume() {
    if (activeSession) {
      navigation.navigate('ActiveSession', { sessionId: activeSession.id });
      return;
    }
    setStarting(true);
    try {
      const session = await startSession();
      navigation.navigate('ActiveSession', { sessionId: session.id });
    } finally {
      setStarting(false);
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={sessions.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={<Text style={styles.placeholder}>No sessions yet — start one below.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('ActiveSession', { sessionId: item.id })}
          >
            <View>
              <Text style={styles.date}>{item.startedAt.toLocaleString()}</Text>
              <Text style={styles.meta}>
                {item.endedAt ? 'Ended' : 'In progress'} · {formatMoonPhase(item.moonPhaseBucket)}
              </Text>
            </View>
          </Pressable>
        )}
      />
      <Pressable style={styles.startButton} onPress={handleStartOrResume} disabled={starting}>
        <Text style={styles.startButtonText}>
          {starting ? 'Starting…' : activeSession ? 'Resume Active Session' : 'Start Session'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholder: { fontSize: 16, color: '#888' },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  date: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, color: '#888', marginTop: 2 },
  startButton: {
    backgroundColor: '#1c6e57',
    margin: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
