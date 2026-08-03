import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/customer/HomeScreen';
import { SearchScreen } from '../screens/customer/SearchScreen';
import { CartScreen } from '../screens/customer/CartScreen';
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
  Cart: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const Stack = createNativeStackNavigator<CustomerStackParamList>();

const HomeTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F3F4F6',
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
        tabBarIcon: ({ color }) => {
          const icons: Record<string, string> = {
            Home: '🏠',
            Search: '🔍',
            Cart: '🛒',
            Profile: '👤',
          };
          return <Text style={{ fontSize: 20 }}>{icons[route.name]}</Text>;
        },
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}    options={{ title: 'Home' }} />
      <Tab.Screen name="Search"  component={SearchScreen}  options={{ title: 'Search' }} />
      <Tab.Screen name="Cart"    component={CartScreen}    options={{ title: 'Cart' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

export const CustomerNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeTabs"      component={HomeTabNavigator} />
      <Stack.Screen name="MealDetail"    component={MealDetailScreen}    options={{ headerShown: true, title: 'Meal Details' }} />
      <Stack.Screen name="Checkout"      component={CheckoutScreen}       options={{ headerShown: true, title: 'Checkout' }} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen}  options={{ headerShown: true, title: 'Track Order' }} />
    </Stack.Navigator>
  );
};

