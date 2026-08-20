import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SpotsStackParamList } from '../../navigation/types';
import type { Spot } from '../../types/models';
import { deactivateSpot, getCachedSpots, subscribeToActiveSpots } from '../../services/spots';

type Props = NativeStackScreenProps<SpotsStackParamList, 'SpotList'>;

export function SpotListScreen({ navigation }: Props) {
  const [spots, setSpots] = useState<Spot[]>([]);

  useEffect(() => {
    getCachedSpots().then(setSpots);
    const unsubscribe = subscribeToActiveSpots(setSpots);
    return unsubscribe;
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={spots}
        keyExtractor={(item) => item.id}
        contentContainerStyle={spots.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={<Text style={styles.placeholder}>No spots yet — add one below.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.coords}>
                {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
              </Text>
            </View>
            <Pressable onPress={() => deactivateSpot(item.id)} hitSlop={8}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        )}
      />
      <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddSpot')}>
        <Text style={styles.addButtonText}>+ Add Spot</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholder: { fontSize: 16, color: '#888' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  rowText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  coords: { fontSize: 13, color: '#888', marginTop: 2 },
  remove: { color: '#c0392b', fontSize: 14 },
  addButton: {
    backgroundColor: '#1c6e57',
    margin: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
