import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SpotsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SpotsStackParamList, 'SpotList'>;

export function SpotListScreen(_props: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Spots — coming in Phase 3</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholder: { fontSize: 16, color: '#888' },
});
