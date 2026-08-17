import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SessionsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SessionsStackParamList, 'ActiveSession'>;

export function ActiveSessionScreen(_props: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Active Session — coming in Phase 5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholder: { fontSize: 16, color: '#888' },
});
