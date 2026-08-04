import React from 'react';
import { View, Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CookDashboardScreen } from '../screens/cook/CookDashboardScreen';
import { CreateListingScreen } from '../screens/cook/CreateListingScreen';
import { CookOrdersScreen } from '../screens/cook/CookOrdersScreen';
import { CookProfileScreen } from '../screens/cook/CookProfileScreen';

export type CookTabParamList = {
  Dashboard: undefined;
  AddListing: { mealToEdit?: any } | undefined;
  Orders: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<CookTabParamList>();

import { Feather } from '@expo/vector-icons';

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
      color={focused ? '#2D6A4F' : '#9CA3AF'} 
    />
    <Text
      className={`text-[10px] mt-1 font-bold ${focused ? 'text-secondary' : 'text-textMuted'}`}
    >
      {label}
    </Text>
  </View>
);

export const CookNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#2D6A4F',
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
        component={CookDashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconName="home" label="Dashboard" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AddListing"
        component={CreateListingScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconName="edit-3" label="Add Meal" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={CookOrdersScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconName="package" label="Orders" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={CookProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconName="user" label="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};
