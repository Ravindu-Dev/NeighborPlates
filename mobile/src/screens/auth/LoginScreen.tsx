import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { TextInput } from '../../components/common/TextInput';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Validation Error', 'Please complete email and password fields.');
      return;
    }
    try {
      await login({ email, password });
    } catch (err) {
      // Error handled by store and displayed on UI
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-surface-elevated">
      <View className="flex-1 justify-center p-6">
        <View className="mb-10 items-center">
          <Text className="text-primary text-4xl font-extrabold tracking-tight">NeighborPlates</Text>
          <Text className="text-textSecondary text-sm mt-2 text-center">
            Fresh local home-cooked meals at your doorstep
          </Text>
        </View>

        <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <Text className="text-textPrimary text-xl font-bold mb-6 text-center">Welcome Back</Text>

          <TextInput
            label="EMAIL ADDRESS"
            placeholder="enter your email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            label="PASSWORD"
            placeholder="enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? (
            <Text className="text-red-500 text-xs mb-4 text-center font-medium">{error}</Text>
          ) : null}

          <Button
            title="LOG IN"
            onPress={handleLogin}
            loading={isLoading}
            variant="primary"
            className="w-full mt-2"
          />
        </View>

        <View className="mt-8 flex-row justify-center items-center">
          <Text className="text-textMuted text-sm">Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register', { role: 'CUSTOMER' })}>
            <Text className="text-primary font-bold text-sm">Register as Customer</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          className="mt-3 align-center self-center" 
          onPress={() => navigation.navigate('Register', { role: 'COOK' })}
        >
          <Text className="text-secondary font-bold text-sm">Sign Up as a Local Cook</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
