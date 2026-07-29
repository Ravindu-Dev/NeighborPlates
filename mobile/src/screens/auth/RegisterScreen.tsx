import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { TextInput } from '../../components/common/TextInput';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ route, navigation }) => {
  const { role } = route.params;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [radius, setRadius] = useState('5'); // default 5km for cooks
  const { register, isLoading, error } = useAuthStore();

  const handleRegister = async () => {
    if (!name || !email || !password || !phone) {
      Alert.alert('Validation Error', 'Please complete all required fields.');
      return;
    }
    try {
      const regData = {
        name,
        email,
        password,
        role,
        phone,
        bio: role === 'COOK' ? bio : undefined,
        deliveryRadius: role === 'COOK' ? parseFloat(radius) : undefined,
        coordinates: [79.8612, 6.9271], // default coordinates Colombo, Sri Lanka
      };
      await register(regData);
    } catch (err) {
      // Error handled by store and displayed on UI
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-surface-elevated">
      <View className="flex-1 justify-center p-6 my-6">
        <View className="mb-6 items-center">
          <Text className="text-primary text-3xl font-extrabold tracking-tight">NeighborPlates</Text>
          <Text className="text-textSecondary text-xs mt-1 text-center">
            Register as a {role === 'COOK' ? 'Home Cook' : 'Customer'}
          </Text>
        </View>

        <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <Text className="text-textPrimary text-xl font-bold mb-6 text-center">Create Account</Text>

          <TextInput
            label="FULL NAME"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <TextInput
            label="EMAIL ADDRESS"
            placeholder="john.doe@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            label="PHONE NUMBER"
            placeholder="+94 77 123 4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <TextInput
            label="PASSWORD"
            placeholder="Choose a strong password (min 6 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {role === 'COOK' ? (
            <>
              <TextInput
                label="ABOUT YOUR KITCHEN / BIO"
                placeholder="Share your culinary background, specialties, etc."
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
              />
              <TextInput
                label="DELIVERY RADIUS (KM)"
                placeholder="e.g. 5"
                value={radius}
                onChangeText={setRadius}
                keyboardType="numeric"
              />
            </>
          ) : null}

          {error ? (
            <Text className="text-red-500 text-xs mb-4 text-center font-medium">{error}</Text>
          ) : null}

          <Button
            title="SIGN UP"
            onPress={handleRegister}
            loading={isLoading}
            variant={role === 'COOK' ? 'secondary' : 'primary'}
            className="w-full mt-2"
          />
        </View>

        <View className="mt-8 flex-row justify-center items-center">
          <Text className="text-textMuted text-sm">Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text className="text-primary font-bold text-sm">Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};
