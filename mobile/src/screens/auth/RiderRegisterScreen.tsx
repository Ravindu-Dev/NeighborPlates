import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { TextInput } from '../../components/common/TextInput';
import { Button } from '../../components/common/Button';
import { DropdownPicker } from '../../components/common/DropdownPicker';
import { DISTRICT_TOWN_DATA } from '../../constants/filterConstants';
import { useAuthStore } from '../../store/authStore';
import { AuthTopBar, AuthRoleTabs, UserRoleType } from '../../components/auth/AuthRoleSwitcher';
import { getCoordinatesForTownAndDistrict } from '../../services/locationService';
import { validateRiderRegisterFields, RiderRegisterValidationErrors } from '../../utils/validation';
import { Feather } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'RiderRegister'>;

const VEHICLES = [
  { id: 'E-Bike', label: 'E-Bike', icon: 'zap' as const },
  { id: 'Motorcycle', label: 'Motorbike', icon: 'navigation' as const },
  { id: 'Bicycle', label: 'Bicycle', icon: 'activity' as const },
  { id: 'Car', label: 'Car', icon: 'truck' as const },
];

export const RiderRegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [town, setTown] = useState('');
  const [vehicleType, setVehicleType] = useState('E-Bike');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [errors, setErrors] = useState<RiderRegisterValidationErrors>({});

  const { register, isLoading, error, clearError } = useAuthStore();

  const handleRoleSwitch = (targetRole: UserRoleType) => {
    if (targetRole === 'CUSTOMER') navigation.navigate('CustomerRegister');
    else if (targetRole === 'COOK') navigation.navigate('CookRegister');
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
    if (error) clearError();
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
    if (error) clearError();
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
    if (error) clearError();
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
    if (error) clearError();
  };

  const handlePlateChange = (val: string) => {
    setVehiclePlate(val);
    if (errors.vehiclePlate) setErrors((prev) => ({ ...prev, vehiclePlate: undefined }));
    if (error) clearError();
  };

  const handleDistrictChange = (val: string) => {
    setDistrict(val);
    setTown('');
    if (errors.district) setErrors((prev) => ({ ...prev, district: undefined, town: undefined }));
    if (error) clearError();
  };

  const handleTownChange = (val: string) => {
    setTown(val);
    if (errors.town) setErrors((prev) => ({ ...prev, town: undefined }));
    if (error) clearError();
  };

  const handleRegister = async () => {
    const validation = validateRiderRegisterFields({
      name,
      email,
      phone,
      password,
      district,
      town,
      vehicleType,
      vehiclePlate,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    try {
      const coords = getCoordinatesForTownAndDistrict(town, district);
      await register({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        phone: phone.trim(),
        role: 'RIDER',
        district,
        town,
        coordinates: [coords.longitude, coords.latitude],
      });
    } catch (err) {
      // Handled by store
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
          <Text className="text-indigo-600 text-3xl font-extrabold tracking-tight">Food Rider Sign Up</Text>
          <Text className="text-textSecondary text-xs mt-1 text-center max-w-[280px]">
            Deliver fresh home-cooked meals in your community and earn on your schedule.
          </Text>
        </View>

        {/* Role Switcher Tabs (Moved Lower Down) */}
        <AuthRoleTabs
          currentRole="RIDER"
          onSelectRole={handleRoleSwitch}
        />

        {/* Form Card */}
        <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <Text className="text-textPrimary text-lg font-bold mb-5 text-center">
            Register as a Delivery Partner
          </Text>

          <TextInput
            label="FULL NAME *"
            placeholder="e.g. Kamal Silva"
            value={name}
            onChangeText={handleNameChange}
            error={errors.name}
            autoCapitalize="words"
          />

          <TextInput
            label="EMAIL ADDRESS *"
            placeholder="kamal@example.com"
            value={email}
            onChangeText={handleEmailChange}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            label="PHONE NUMBER *"
            placeholder="e.g. 077 123 4567 or +94 77 123 4567"
            value={phone}
            onChangeText={handlePhoneChange}
            error={errors.phone}
            keyboardType="phone-pad"
          />

          <TextInput
            label="PASSWORD *"
            placeholder="Min 6 characters"
            value={password}
            onChangeText={handlePasswordChange}
            error={errors.password}
            secureTextEntry
          />

          {/* Vehicle Type Selection Pills */}
          <View className="mb-4">
            <Text className="text-textPrimary font-semibold text-xs mb-2 ml-1">
              PRIMARY DELIVERY VEHICLE *
            </Text>
            <View className="flex-row gap-2">
              {VEHICLES.map((v) => {
                const isSelected = vehicleType === v.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => setVehicleType(v.id)}
                    activeOpacity={0.8}
                    style={[
                      styles.vehiclePill,
                      isSelected && styles.vehiclePillSelected,
                    ]}
                  >
                    <Feather
                      name={v.icon}
                      size={14}
                      color={isSelected ? '#4F46E5' : '#6B7280'}
                    />
                    <Text
                      style={[
                        styles.vehicleLabel,
                        isSelected && styles.vehicleLabelSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {v.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TextInput
            label="VEHICLE PLATE / REGISTRATION (OPTIONAL)"
            placeholder="e.g. WP-4092 or #EB-10"
            value={vehiclePlate}
            onChangeText={handlePlateChange}
            error={errors.vehiclePlate}
            autoCapitalize="characters"
          />

          <DropdownPicker
            label="OPERATING DISTRICT *"
            placeholder="Select District..."
            selectedValue={district}
            onValueChange={handleDistrictChange}
            error={errors.district}
            options={Object.keys(DISTRICT_TOWN_DATA)}
            iconName="map-pin"
          />

          <DropdownPicker
            label="OPERATING TOWN / HUB *"
            placeholder={district ? "Select Town..." : "Select District first..."}
            selectedValue={town}
            onValueChange={handleTownChange}
            error={errors.town}
            options={district ? DISTRICT_TOWN_DATA[district] || [] : []}
            disabled={!district}
            iconName="navigation"
          />

          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex-row items-center">
              <Feather name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 8 }} />
              <Text className="text-red-600 text-xs font-semibold flex-1 leading-4">{error}</Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
            className="w-full mt-3 bg-indigo-600 rounded-xl py-3.5 items-center justify-center flex-row shadow-sm shadow-indigo-300"
          >
            <Text className="text-white font-bold text-sm tracking-wide">
              {isLoading ? 'REGISTERING...' : 'BECOME A DELIVERY RIDER'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer Link */}
        <View className="mt-6 mb-4 flex-row justify-center items-center">
          <Text className="text-textMuted text-sm">Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text className="text-indigo-600 font-bold text-sm">Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  vehiclePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 4,
  },
  vehiclePillSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  vehicleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  vehicleLabelSelected: {
    color: '#4F46E5',
  },
});
