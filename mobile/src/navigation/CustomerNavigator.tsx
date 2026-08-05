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
import { PaymentScreen } from '../screens/customer/PaymentScreen';
import { OrderTrackingScreen } from '../screens/customer/OrderTrackingScreen';
import { useCartStore } from '../store/cartStore';

import { Feather } from '@expo/vector-icons';

export type CustomerStackParamList = {
  HomeTabs: { screen?: string } | undefined;
  MealDetail: { mealId: string };
  Checkout: undefined;
  Payment: {
    address: string;
    deliveryMethod: string;
    specialInstructions: string;
    scheduledFor: string;
    subtotal: number;
    promoDiscount: number;
    deliveryFee: number;
    total: number;
  };
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
  const cartItemCount = useCartStore((state) => state.getItemCount());

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
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
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Feather.glyphMap> = {
            Home: 'home',
            Search: 'search',
            Cart: 'shopping-cart',
            Profile: 'user',
          };
          const iconName = icons[route.name] || 'home';
          return <Feather name={iconName} size={size || 20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}    options={{ title: 'Home' }} />
      <Tab.Screen name="Search"  component={SearchScreen}  options={{ title: 'Search' }} />
      <Tab.Screen name="Cart"    component={CartScreen}    options={{ title: 'Cart', tabBarBadge: cartItemCount > 0 ? cartItemCount : undefined }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

export const CustomerNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeTabs"      component={HomeTabNavigator} />
      <Stack.Screen name="MealDetail"    component={MealDetailScreen} />
      <Stack.Screen name="Checkout"      component={CheckoutScreen} />
      <Stack.Screen name="Payment"       component={PaymentScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
    </Stack.Navigator>
  );
};

