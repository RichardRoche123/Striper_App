import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { RootTabParamList, SessionsStackParamList, SpotsStackParamList } from './types';
import { SessionListScreen } from '../screens/sessions/SessionListScreen';
import { ActiveSessionScreen } from '../screens/sessions/ActiveSessionScreen';
import { SpotListScreen } from '../screens/spots/SpotListScreen';
import { AddSpotScreen } from '../screens/spots/AddSpotScreen';
import { RecommendationsScreen } from '../screens/recommendations/RecommendationsScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();
const SessionsStack = createNativeStackNavigator<SessionsStackParamList>();
const SpotsStack = createNativeStackNavigator<SpotsStackParamList>();

function SessionsNavigator() {
  return (
    <SessionsStack.Navigator>
      <SessionsStack.Screen
        name="SessionList"
        component={SessionListScreen}
        options={{ title: 'Sessions' }}
      />
      <SessionsStack.Screen
        name="ActiveSession"
        component={ActiveSessionScreen}
        options={{ title: 'Active Session' }}
      />
    </SessionsStack.Navigator>
  );
}

function SpotsNavigator() {
  return (
    <SpotsStack.Navigator>
      <SpotsStack.Screen
        name="SpotList"
        component={SpotListScreen}
        options={{ title: 'Spots' }}
      />
      <SpotsStack.Screen
        name="AddSpot"
        component={AddSpotScreen}
        options={{ title: 'Add Spot' }}
      />
    </SpotsStack.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            if (route.name === 'Sessions') {
              return <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />;
            }
            if (route.name === 'Spots') {
              return <Ionicons name={focused ? 'location' : 'location-outline'} size={size} color={color} />;
            }
            return <Ionicons name={focused ? 'star' : 'star-outline'} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen
          name="Sessions"
          component={SessionsNavigator}
          options={{ headerShown: false }}
        />
        <Tab.Screen
          name="Spots"
          component={SpotsNavigator}
          options={{ headerShown: false }}
        />
        <Tab.Screen
          name="Recommendations"
          component={RecommendationsScreen}
          options={{ title: 'Find' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
