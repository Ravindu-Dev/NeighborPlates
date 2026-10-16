import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, StyleSheet, Modal } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { TextInput } from '../../components/common/TextInput';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { Feather } from '@expo/vector-icons';
import { getBackendUrl, setCustomBackendUrl, getCustomBackendUrl } from '../../services/api';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showServerModal, setShowServerModal] = useState(false);
  const [currentServerUrl, setCurrentServerUrl] = useState(getBackendUrl());
  const [serverInput, setServerInput] = useState(getBackendUrl());
  const { login, isLoading, error } = useAuthStore();

  useEffect(() => {
    getCustomBackendUrl().then(custom => {
      const active = custom || getBackendUrl();
      setCurrentServerUrl(active);
      setServerInput(active);
    });
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Validation Error', 'Please complete email and password fields.');
      return;
    }
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
          <TouchableOpacity onPress={() => setShowServerModal(true)} activeOpacity={0.8}>
            <Image
              source={require('../../../assets/Logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
              className="mb-2"
            />
          </TouchableOpacity>
          <Text className="text-primary text-3xl font-extrabold tracking-tight">NeighborPlates</Text>
          <Text className="text-textSecondary text-xs mt-1 text-center max-w-[280px]">
            Fresh local home-cooked meals at your doorstep
          </Text>
          <TouchableOpacity
            onPress={() => setShowServerModal(true)}
            className="mt-3 flex-row items-center bg-gray-100 px-3 py-1.5 rounded-full"
            activeOpacity={0.7}
          >
            <Feather name="globe" size={12} color="#023c69" />
            <Text className="text-[11px] text-gray-700 font-semibold ml-1.5" numberOfLines={1}>
              Server: {currentServerUrl.replace(/^https?:\/\//, '')}
            </Text>
            <Feather name="edit-2" size={10} color="#9CA3AF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>

        {/* Login Form Card */}
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

      {/* Server Config Modal */}
      <Modal visible={showServerModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Backend Server Settings</Text>
            <Text style={styles.modalSubtitle}>
              Connect the app to your Cloudflare tunnel or backend URL.
            </Text>

            <TextInput
              label="SERVER API URL"
              placeholder="https://your-tunnel.trycloudflare.com"
              value={serverInput}
              onChangeText={setServerInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Button
                title="Reset Default"
                variant="outline"
                className="flex-1"
                onPress={async () => {
                  await setCustomBackendUrl(null);
                  const def = getBackendUrl();
                  setCurrentServerUrl(def);
                  setServerInput(def);
                  setShowServerModal(false);
                  Alert.alert('Reset', 'Server URL reset to build default.');
                }}
              />
              <Button
                title="Save & Connect"
                variant="primary"
                className="flex-1"
                onPress={async () => {
                  if (!serverInput.trim()) {
                    Alert.alert('Error', 'Please enter a valid URL');
                    return;
                  }
                  await setCustomBackendUrl(serverInput.trim());
                  setCurrentServerUrl(serverInput.trim());
                  setShowServerModal(false);
                  Alert.alert('Saved', 'Server URL updated successfully!');
                }}
              />
            </View>
            <TouchableOpacity
              onPress={() => setShowServerModal(false)}
              style={{ marginTop: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#6B7280', fontSize: 13, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 18,
  },
});

