import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SessionsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SessionsStackParamList, 'SessionList'>;

export function SessionListScreen(_props: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Sessions — coming in Phase 5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholder: { fontSize: 16, color: '#888' },
});
