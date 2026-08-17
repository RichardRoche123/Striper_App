import { NavigatorScreenParams } from '@react-navigation/native';

export type SessionsStackParamList = {
  SessionList: undefined;
  ActiveSession: { sessionId: string };
};

export type SpotsStackParamList = {
  SpotList: undefined;
  AddSpot: undefined;
};

export type RootTabParamList = {
  Sessions: NavigatorScreenParams<SessionsStackParamList>;
  Spots: NavigatorScreenParams<SpotsStackParamList>;
  Recommendations: undefined;
};
