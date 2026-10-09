import React from 'react';
import { View, Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RiderDashboardScreen } from '../screens/rider/RiderDashboardScreen';
import { RouteScreen } from '../screens/rider/RouteScreen';
import { DeliveryHistoryScreen } from '../screens/rider/DeliveryHistoryScreen';
import { RiderProfileScreen } from '../screens/rider/RiderProfileScreen';
import { ActiveDeliveryScreen } from '../screens/rider/ActiveDeliveryScreen';
import { DeliveryConfirmationScreen } from '../screens/rider/DeliveryConfirmationScreen';
import { RiderOnboardingScreen } from '../screens/rider/RiderOnboardingScreen';
import { Feather } from '@expo/vector-icons';

export type RiderTabParamList = {
  Jobs: undefined;
  Route: undefined;
  Earnings: undefined;
  Rider: undefined;
  Dashboard?: undefined;
  AvailableOrders?: undefined;
  History?: undefined;
  Profile?: undefined;
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
  focused,
  showBadge = false,
}: { 
  iconName: keyof typeof Feather.glyphMap; 
  label: string; 
  focused: boolean; 
  showBadge?: boolean;
}) => (
  <View className="items-center justify-center pt-1.5 relative">
    <View className="relative">
      <Feather 
        name={iconName} 
        size={20} 
        color={focused ? '#9A3412' : '#9CA3AF'} // Terracotta / warm orange-brown matching reference design
      />
      {showBadge && (
        <View className="w-2.5 h-2.5 rounded-full bg-[#EA580C] absolute -top-1 -right-1.5 border border-white" />
      )}
    </View>
    <Text
      className={`text-[10px] mt-1 font-bold ${focused ? 'text-[#9A3412]' : 'text-textMuted'}`}
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
        tabBarActiveTintColor: '#9A3412',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 4,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
      }}
    >
      <Tab.Screen
        name="Jobs"
        component={RiderDashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="briefcase" label="Jobs" focused={focused} showBadge={true} />
          ),
        }}
      />
      <Tab.Screen
        name="Route"
        component={RouteScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="compass" label="Route" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={DeliveryHistoryScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="credit-card" label="Earnings" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Rider"
        component={RiderProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="user" label="Rider" focused={focused} />
          ),
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
