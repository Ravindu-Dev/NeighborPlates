import React from 'react';
import { View, Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RiderDashboardScreen } from '../screens/rider/RiderDashboardScreen';
import { AvailableOrdersScreen } from '../screens/rider/AvailableOrdersScreen';
import { ActiveDeliveryScreen } from '../screens/rider/ActiveDeliveryScreen';
import { DeliveryHistoryScreen } from '../screens/rider/DeliveryHistoryScreen';
import { RiderProfileScreen } from '../screens/rider/RiderProfileScreen';
import { DeliveryConfirmationScreen } from '../screens/rider/DeliveryConfirmationScreen';
import { RiderOnboardingScreen } from '../screens/rider/RiderOnboardingScreen';
import { Feather } from '@expo/vector-icons';

export type RiderTabParamList = {
  Dashboard: undefined;
  AvailableOrders: undefined;
  History: undefined;
  Profile: undefined;
};

export type RiderStackParamList = {
  Onboarding: undefined;
  Tabs: undefined;
  ActiveDelivery: { orderId: string };
  DeliveryConfirmation: { orderId: string; earnings: number };
};

const Tab = createBottomTabNavigator<RiderTabParamList>();
const Stack = createNativeStackNavigator<RiderStackParamList>();

const TabIcon = ({ 
  iconName, 
  label, 
  focused 
}: { 
  iconName: keyof typeof Feather.glyphMap; 
  label: string; 
  focused: boolean; 
}) => (
  <View className="items-center justify-center pt-1.5">
    <Feather 
      name={iconName} 
      size={20} 
      color={focused ? '#6366F1' : '#9CA3AF'} // Indigo-500 for active rider tab
    />
    <Text
      className={`text-[10px] mt-1 font-bold ${focused ? 'text-indigo-500' : 'text-textMuted'}`}
    >
      {label}
    </Text>
  </View>
);

const RiderTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#6366F1', // Indigo-500
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 4,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={RiderDashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconName="home" label="Dashboard" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AvailableOrders"
        component={AvailableOrdersScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconName="list" label="Orders" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={DeliveryHistoryScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconName="clock" label="History" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={RiderProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconName="user" label="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

export const RiderNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={RiderOnboardingScreen} />
      <Stack.Screen name="Tabs" component={RiderTabNavigator} />
      <Stack.Screen name="ActiveDelivery" component={ActiveDeliveryScreen} />
      <Stack.Screen name="DeliveryConfirmation" component={DeliveryConfirmationScreen} />
    </Stack.Navigator>
  );
};
