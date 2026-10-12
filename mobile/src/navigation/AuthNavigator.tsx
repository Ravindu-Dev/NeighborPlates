import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { CustomerRegisterScreen } from '../screens/auth/CustomerRegisterScreen';
import { CookRegisterScreen } from '../screens/auth/CookRegisterScreen';
import { RiderRegisterScreen } from '../screens/auth/RiderRegisterScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';

export type AuthStackParamList = {
  Login: undefined;
  CustomerRegister: undefined;
  CookRegister: undefined;
  RiderRegister: undefined;
  Register: { role: 'CUSTOMER' | 'COOK' | 'RIDER' };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="CustomerRegister" component={CustomerRegisterScreen} />
      <Stack.Screen name="CookRegister" component={CookRegisterScreen} />
      <Stack.Screen name="RiderRegister" component={RiderRegisterScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};
