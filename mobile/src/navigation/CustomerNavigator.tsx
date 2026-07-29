import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/customer/HomeScreen';
import { SearchScreen } from '../screens/customer/SearchScreen';
import { OrdersScreen } from '../screens/customer/OrdersScreen';
import { ProfileScreen } from '../screens/customer/ProfileScreen';
import { MealDetailScreen } from '../screens/customer/MealDetailScreen';
import { CheckoutScreen } from '../screens/customer/CheckoutScreen';
import { OrderTrackingScreen } from '../screens/customer/OrderTrackingScreen';

export type CustomerStackParamList = {
  HomeTabs: undefined;
  MealDetail: { mealId: string };
  Checkout: { mealId: string; quantity: number };
  OrderTracking: { orderId: string };
};

export type CustomerTabParamList = {
  Home: undefined;
  Search: undefined;
  Orders: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const Stack = createNativeStackNavigator<CustomerStackParamList>();

const HomeTabNavigator = () => {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#FF6B35' }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Browse Meals' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: 'My Orders' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
    </Tab.Navigator>
  );
};

export const CustomerNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeTabs" component={HomeTabNavigator} />
      <Stack.Screen name="MealDetail" component={MealDetailScreen} options={{ headerShown: true, title: 'Meal Details' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: true, title: 'Checkout' }} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ headerShown: true, title: 'Track Order' }} />
    </Stack.Navigator>
  );
};
