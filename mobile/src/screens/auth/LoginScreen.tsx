import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { TextInput } from '../../components/common/TextInput';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { Feather } from '@expo/vector-icons';

import { validateLoginFields, LoginValidationErrors } from '../../utils/validation';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginValidationErrors>({});
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
    if (error) clearError();
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
    if (error) clearError();
  };

  const handleLogin = async () => {
    const validation = validateLoginFields(email, password);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    try {
      await login({ email: email.trim(), password: password.trim() });
    } catch (err) {
      // Error handled by store and displayed on UI
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      className="bg-surface-elevated"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.outerContainer}>
        {/* Brand Header */}
        <View className="mb-8 items-center">
          <Image
            source={require('../../../assets/Logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
            className="mb-2"
          />
          <Text className="text-primary text-3xl font-extrabold tracking-tight">NeighborPlates</Text>
          <Text className="text-textSecondary text-xs mt-1 text-center max-w-[280px]">
            Fresh local home-cooked meals at your doorstep
          </Text>
        </View>

        {/* Login Form Card */}
        <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <Text className="text-textPrimary text-xl font-bold mb-6 text-center">Welcome Back</Text>

          <TextInput
            label="EMAIL ADDRESS"
            placeholder="e.g. rider@neighborplates.com"
            value={email}
            onChangeText={handleEmailChange}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            label="PASSWORD"
            placeholder="Enter your password (min 6 characters)"
            value={password}
            onChangeText={handlePasswordChange}
            error={errors.password}
            secureTextEntry
          />

          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex-row items-center">
              <Feather name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 8 }} />
              <Text className="text-red-600 text-xs font-semibold flex-1 leading-4">{error}</Text>
            </View>
          ) : null}

          <Button
            title="LOG IN"
            onPress={handleLogin}
            loading={isLoading}
            variant="primary"
            className="w-full mt-2"
          />
        </View>

        {/* Divider: Or Register As */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR REGISTER AS</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* 3 Registration Buttons Aligned on a Single Line */}
        <View style={styles.roleButtonsRow}>
          {/* 1. Customer Button */}
          <TouchableOpacity
            style={[styles.roleButtonCard, styles.customerCard]}
            onPress={() => navigation.navigate('CustomerRegister')}
            activeOpacity={0.8}
            accessibilityLabel="Register as Customer"
          >
            <View style={[styles.roleIconCircle, { backgroundColor: '#FFF7ED' }]}>
              <Feather name="shopping-bag" size={16} color="#FF6B35" />
            </View>
            <Text style={[styles.roleButtonTitle, { color: '#FF6B35' }]} numberOfLines={1}>
              Customer
            </Text>
            <Text style={styles.roleButtonSubtitle} numberOfLines={1}>
              Order Food
            </Text>
          </TouchableOpacity>

          {/* 2. Local Cook Button */}
          <TouchableOpacity
            style={[styles.roleButtonCard, styles.cookCard]}
            onPress={() => navigation.navigate('CookRegister')}
            activeOpacity={0.8}
            accessibilityLabel="Register as Local Cook"
          >
            <View style={[styles.roleIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Feather name="coffee" size={16} color="#2D6A4F" />
            </View>
            <Text style={[styles.roleButtonTitle, { color: '#2D6A4F' }]} numberOfLines={1}>
              Local Cook
            </Text>
            <Text style={styles.roleButtonSubtitle} numberOfLines={1}>
              Sell Dishes
            </Text>
          </TouchableOpacity>

          {/* 3. Food Rider Button */}
          <TouchableOpacity
            style={[styles.roleButtonCard, styles.riderCard]}
            onPress={() => navigation.navigate('RiderRegister')}
            activeOpacity={0.8}
            accessibilityLabel="Register as Food Rider"
          >
            <View style={[styles.roleIconCircle, { backgroundColor: '#EEF2FF' }]}>
              <Feather name="send" size={16} color="#4F46E5" />
            </View>
            <Text style={[styles.roleButtonTitle, { color: '#4F46E5' }]} numberOfLines={1}>
              Food Rider
            </Text>
            <Text style={styles.roleButtonSubtitle} numberOfLines={1}>
              Deliver Meals
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  logoImage: {
    width: 84,
    height: 84,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  roleButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    justifyContent: 'space-between',
  },
  roleButtonCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  customerCard: {
    borderColor: '#FED7AA',
  },
  cookCard: {
    borderColor: '#A7F3D0',
  },
  riderCard: {
    borderColor: '#C7D2FE',
  },
  roleIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  roleButtonTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  roleButtonSubtitle: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
});
