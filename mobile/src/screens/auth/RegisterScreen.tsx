import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ route, navigation }) => {
  const role = route.params?.role;

  useEffect(() => {
    if (role === 'COOK') {
      navigation.replace('CookRegister');
    } else if (role === 'RIDER') {
      navigation.replace('RiderRegister');
    } else {
      navigation.replace('CustomerRegister');
    }
  }, [role, navigation]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <ActivityIndicator size="large" color="#FF6B35" />
    </View>
  );
};
