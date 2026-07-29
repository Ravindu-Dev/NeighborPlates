import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { UserManagementScreen } from '../screens/admin/UserManagementScreen';
import { ContentModerationScreen } from '../screens/admin/ContentModerationScreen';
import { AnalyticsScreen } from '../screens/admin/AnalyticsScreen';
import { AdminProfileScreen } from '../screens/admin/AdminProfileScreen';

export type AdminTabParamList = {
  Users: undefined;
  Moderation: undefined;
  Analytics: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

export const AdminNavigator = () => {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#1A1A2E' }}>
      <Tab.Screen name="Users" component={UserManagementScreen} options={{ title: 'Verify Cooks' }} />
      <Tab.Screen name="Moderation" component={ContentModerationScreen} options={{ title: 'Content Moderation' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Platform Stats' }} />
      <Tab.Screen name="Profile" component={AdminProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};
