import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { TextInput } from '../../components/common/TextInput';
import { Button } from '../../components/common/Button';
import { DropdownPicker } from '../../components/common/DropdownPicker';
import { DISTRICT_TOWN_DATA } from '../../constants/filterConstants';
import { useAuthStore } from '../../store/authStore';
import { AuthTopBar, AuthRoleTabs, UserRoleType } from '../../components/auth/AuthRoleSwitcher';

type Props = NativeStackScreenProps<AuthStackParamList, 'CustomerRegister'>;

export const CustomerRegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [town, setTown] = useState('');
  const { register, isLoading, error } = useAuthStore();

  const handleRoleSwitch = (targetRole: UserRoleType) => {
    if (targetRole === 'COOK') navigation.navigate('CookRegister');
    else if (targetRole === 'RIDER') navigation.navigate('RiderRegister');
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'Please complete your name, email, phone, and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        phone: phone.trim(),
        role: 'CUSTOMER',
        district: district || undefined,
        town: town || undefined,
      });
    } catch (err) {
      // Error is caught by authStore and rendered in UI
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      className="bg-surface-elevated"
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ maxWidth: 480, width: '100%', alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 30 }}>
        {/* Top Back Navigation with Safe Area Padding */}
        <AuthTopBar onBackToLogin={() => navigation.navigate('Login')} />

        {/* Header Branding */}
        <View className="mb-4 items-center mt-2">
          <Image
            source={require('../../../assets/Logo.png')}
            style={{ width: 72, height: 72 }}
            resizeMode="contain"
            className="mb-2"
          />
          <Text className="text-primary text-3xl font-extrabold tracking-tight">Customer Sign Up</Text>
          <Text className="text-textSecondary text-xs mt-1 text-center max-w-[280px]">
            Enjoy healthy, home-cooked dishes made fresh by talented cooks near you.
          </Text>
        </View>

        {/* Role Switcher Tabs (Moved Lower Down) */}
        <AuthRoleTabs
          currentRole="CUSTOMER"
          onSelectRole={handleRoleSwitch}
        />

        {/* Form Card */}
        <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <Text className="text-textPrimary text-lg font-bold mb-5 text-center">
            Create Your Customer Account
          </Text>

          <TextInput
            label="FULL NAME"
            placeholder="e.g. John Doe"
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
            placeholder="Min 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <DropdownPicker
            label="DEFAULT DISTRICT (OPTIONAL)"
            placeholder="Select District..."
            selectedValue={district}
            onValueChange={(val) => {
              setDistrict(val);
              setTown('');
            }}
            options={Object.keys(DISTRICT_TOWN_DATA)}
            iconName="map-pin"
          />

          <DropdownPicker
            label="NEIGHBORHOOD / TOWN (OPTIONAL)"
            placeholder={district ? "Select Town..." : "Select District first..."}
            selectedValue={town}
            onValueChange={setTown}
            options={district ? DISTRICT_TOWN_DATA[district] || [] : []}
            disabled={!district}
            iconName="navigation"
          />

          {error ? (
            <Text className="text-red-500 text-xs mb-4 text-center font-medium">{error}</Text>
          ) : null}

          <Button
            title="CREATE CUSTOMER ACCOUNT"
            onPress={handleRegister}
            loading={isLoading}
            variant="primary"
            className="w-full mt-2"
          />
        </View>

        {/* Footer Link */}
        <View className="mt-6 mb-4 flex-row justify-center items-center">
          <Text className="text-textMuted text-sm">Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text className="text-primary font-bold text-sm">Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};
