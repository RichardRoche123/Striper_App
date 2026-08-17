import { StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../../navigation/types';

type Props = BottomTabScreenProps<RootTabParamList, 'Recommendations'>;

export function RecommendationsScreen(_props: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Recommendations — coming in Phase 6</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholder: { fontSize: 16, color: '#888' },
});
