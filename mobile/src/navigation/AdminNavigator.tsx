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

import { Feather } from '@expo/vector-icons';

export const AdminNavigator = () => {
  return (
    <Tab.Navigator 
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#1A1A2E',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Feather.glyphMap> = {
            Users: 'users',
            Moderation: 'alert-triangle',
            Analytics: 'bar-chart-2',
            Profile: 'user',
          };
          const iconName = icons[route.name] || 'users';
          return <Feather name={iconName} size={size || 20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Users" component={UserManagementScreen} options={{ title: 'Verify Cooks' }} />
      <Tab.Screen name="Moderation" component={ContentModerationScreen} options={{ title: 'Content Moderation' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Platform Stats' }} />
      <Tab.Screen name="Profile" component={AdminProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};
