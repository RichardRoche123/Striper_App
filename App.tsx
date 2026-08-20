import { useEffect } from 'react';
import { AppNavigator } from './src/navigation/AppNavigator';
import { startQueueSync } from './src/services/offlineQueue';

export default function App() {
  useEffect(() => {
    const unsubscribe = startQueueSync();
    return unsubscribe;
  }, []);

  return <AppNavigator />;
}
