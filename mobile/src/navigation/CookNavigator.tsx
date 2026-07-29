import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CookDashboardScreen } from '../screens/cook/CookDashboardScreen';
import { CreateListingScreen } from '../screens/cook/CreateListingScreen';
import { CookOrdersScreen } from '../screens/cook/CookOrdersScreen';
import { CookProfileScreen } from '../screens/cook/CookProfileScreen';

export type CookTabParamList = {
  Dashboard: undefined;
  AddListing: undefined;
  Orders: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<CookTabParamList>();

export const CookNavigator = () => {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#2D6A4F' }}>
      <Tab.Screen name="Dashboard" component={CookDashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="AddListing" component={CreateListingScreen} options={{ title: 'Add Meal' }} />
      <Tab.Screen name="Orders" component={CookOrdersScreen} options={{ title: 'Manage Orders' }} />
      <Tab.Screen name="Profile" component={CookProfileScreen} options={{ title: 'My Profile' }} />
    </Tab.Navigator>
  );
};
