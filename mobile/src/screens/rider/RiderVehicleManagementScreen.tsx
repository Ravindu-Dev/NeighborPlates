import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { vehicleService, Vehicle, VehicleRequest } from '../../services/vehicleService';

const VEHICLE_TYPES = [
  { id: 'E-Bike', label: 'E-Bike', icon: 'bicycle' },
  { id: 'Scooter', label: 'Scooter', icon: 'moped' },
  { id: 'Motorcycle', label: 'Motorcycle', icon: 'motorbike' },
  { id: 'Bicycle', label: 'Bicycle', icon: 'bike' },
  { id: 'Car', label: 'Car', icon: 'car' },
];

export const RiderVehicleManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Form fields
  const [formType, setFormType] = useState('E-Bike');
  const [formMakeModel, setFormMakeModel] = useState('');
  const [formPlate, setFormPlate] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formIsPrimary, setFormIsPrimary] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchVehicles = useCallback(async () => {
    try {
      const data = await vehicleService.getVehicles();
      setVehicles(data);
    } catch (err: any) {
      console.warn('[RiderVehicles] Fetch error:', err);
      Alert.alert('Error', 'Unable to load registered vehicles. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicles();
  };

  const openCreateModal = () => {
    setEditingVehicle(null);
    setFormType('E-Bike');
    setFormMakeModel('');
    setFormPlate('');
    setFormColor('');
    setFormYear('');
    setFormIsPrimary(vehicles.length === 0);
    setFormErrors({});
    setModalVisible(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormType(v.vehicleType || 'E-Bike');
    setFormMakeModel(v.makeModel || '');
    setFormPlate(v.plateNumber || '');
    setFormColor(v.color || '');
    setFormYear(v.year ? String(v.year) : '');
    setFormIsPrimary(!!v.isPrimary);
    setFormErrors({});
    setModalVisible(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formMakeModel.trim()) {
      errors.makeModel = 'Make & model is required (e.g. Rad Power E-Bike)';
    }
    if (!formPlate.trim()) {
      errors.plateNumber = 'Plate number / Fleet ID is required';
    } else if (formPlate.trim().length < 3) {
      errors.plateNumber = 'Plate number must be at least 3 characters';
    }

    if (formYear.trim()) {
      const parsed = parseInt(formYear.trim(), 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(parsed) || parsed < 1990 || parsed > currentYear + 1) {
        errors.year = `Year must be between 1990 and ${currentYear + 1}`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveVehicle = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const payload: VehicleRequest = {
        vehicleType: formType,
        makeModel: formMakeModel.trim(),
        plateNumber: formPlate.trim(),
        color: formColor.trim() || undefined,
        year: formYear.trim() ? parseInt(formYear.trim(), 10) : undefined,
        isPrimary: formIsPrimary,
      };

      if (editingVehicle) {
        await vehicleService.updateVehicle(editingVehicle.id, payload);
        Alert.alert('Updated', 'Vehicle details successfully updated!');
      } else {
        await vehicleService.createVehicle(payload);
        Alert.alert('Registered', 'New delivery vehicle added to your fleet!');
      }

      setModalVisible(false);
      fetchVehicles();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Could not save vehicle details. Please check your connection.';
      Alert.alert('Save Failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPrimary = async (vehicle: Vehicle) => {
    if (vehicle.isPrimary) return;

    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await vehicleService.setPrimaryVehicle(vehicle.id);
      fetchVehicles();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Could not set active vehicle.';
      Alert.alert('Error', message);
    }
  };

  const promptDeleteVehicle = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete) return;

    setDeleting(true);
    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      await vehicleService.deleteVehicle(vehicleToDelete.id);
      setDeleteConfirmVisible(false);
      setVehicleToDelete(null);
      Alert.alert('Vehicle Removed', 'The vehicle was removed from your active fleet.');
      fetchVehicles();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Cannot remove vehicle at this time. Please check active deliveries.';
      Alert.alert('Cannot Remove Vehicle', message);
    } finally {
      setDeleting(false);
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'Scooter':
        return '🛵';
      case 'Motorcycle':
        return '🏍️';
      case 'Bicycle':
        return '🚲';
      case 'Car':
        return '🚗';
      case 'E-Bike':
      default:
        return '⚡🚲';
    }
  };

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      {/* ── Header ── */}
      <View className="bg-white pt-12 pb-4 px-5 border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
          >
            <Feather name="arrow-left" size={20} color="#1F2937" />
          </TouchableOpacity>
          <View>
            <Text className="text-textPrimary font-black text-xl">Vehicle Fleet</Text>
            <Text className="text-textMuted text-xs font-semibold">
              Manage your delivery rides & gear
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={openCreateModal}
          activeOpacity={0.8}
          className="bg-[#9A3412] px-3.5 py-2 rounded-xl flex-row items-center shadow-xs"
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text className="text-white font-black text-xs ml-1">Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── Body Content ── */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#9A3412" />
          <Text className="text-textMuted text-xs font-bold mt-3">Loading vehicles...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9A3412" />
          }
        >
          {/* Active Ride Banner */}
          {vehicles.length > 0 && (
            <View className="bg-[#FFF7ED] border border-[#FFEDD5] rounded-2xl p-4 mb-4 flex-row items-center">
              <View className="w-9 h-9 rounded-full bg-[#EA580C]/10 items-center justify-center mr-3">
                <Feather name="zap" size={18} color="#EA580C" />
              </View>
              <View className="flex-1">
                <Text className="text-[#9A3412] font-black text-xs">Active Delivery Assignment</Text>
                <Text className="text-[#9A3412]/80 text-[11px] leading-4 mt-0.5">
                  Customers and dispatch identify you by your primary vehicle during order handoffs.
                </Text>
              </View>
            </View>
          )}

          {/* Empty State */}
          {vehicles.length === 0 && (
            <View className="bg-white rounded-3xl p-8 items-center border border-gray-150 shadow-sm mt-6">
              <View className="w-20 h-20 rounded-full bg-orange-50 items-center justify-center mb-4">
                <Text style={{ fontSize: 36 }}>🛵</Text>
              </View>
              <Text className="text-textPrimary font-black text-lg mb-1">
                No Vehicles Registered
              </Text>
              <Text className="text-textSecondary text-xs text-center leading-5 mb-6 px-4">
                Register your primary delivery ride (E-bike, scooter, motorcycle, or car) to receive delivery jobs in your area.
              </Text>
              <TouchableOpacity
                onPress={openCreateModal}
                activeOpacity={0.85}
                className="bg-[#9A3412] px-6 py-3.5 rounded-2xl flex-row items-center shadow-md"
              >
                <Feather name="plus-circle" size={18} color="#FFFFFF" />
                <Text className="text-white font-black text-sm ml-2">
                  Register Your First Vehicle
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Vehicle List */}
          {vehicles.map((v) => {
            const isPrimary = !!v.isPrimary;

            return (
              <View
                key={v.id}
                className={`bg-white rounded-2xl p-4 mb-3 border shadow-xs ${
                  isPrimary ? 'border-[#EA580C] bg-[#FFFDFB]' : 'border-gray-200'
                }`}
              >
                {/* Header row */}
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-12 h-12 rounded-2xl bg-[#F3F4F6] items-center justify-center mr-3">
                      <Text style={{ fontSize: 22 }}>{getVehicleIcon(v.vehicleType)}</Text>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center flex-wrap gap-1.5">
                        <Text className="text-textPrimary font-black text-base" numberOfLines={1}>
                          {v.makeModel}
                        </Text>
                        {isPrimary && (
                          <View className="bg-[#EA580C] px-2 py-0.5 rounded-full">
                            <Text className="text-white font-black text-[9px] uppercase tracking-wider">
                              Active Ride
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-textMuted text-xs font-semibold mt-0.5">
                        {v.vehicleType} • {v.color || 'Standard Color'}
                        {v.year ? ` • ${v.year}` : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Actions: Edit & Delete */}
                  <View className="flex-row items-center gap-1">
                    <TouchableOpacity
                      onPress={() => openEditModal(v)}
                      activeOpacity={0.7}
                      className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                    >
                      <Feather name="edit-2" size={14} color="#4B5563" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => promptDeleteVehicle(v)}
                      activeOpacity={0.7}
                      className="w-8 h-8 rounded-full bg-red-50 items-center justify-center"
                    >
                      <Feather name="trash-2" size={14} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Plate and Footer row */}
                <View className="pt-2 border-t border-gray-100 flex-row items-center justify-between">
                  <View className="bg-gray-100 px-3 py-1 rounded-lg flex-row items-center">
                    <Feather name="hash" size={12} color="#6B7280" />
                    <Text className="text-textPrimary font-mono font-black text-xs ml-1">
                      {v.plateNumber}
                    </Text>
                  </View>

                  {!isPrimary ? (
                    <TouchableOpacity
                      onPress={() => handleSetPrimary(v)}
                      activeOpacity={0.8}
                      className="border border-[#9A3412] px-3 py-1 rounded-xl flex-row items-center"
                    >
                      <Feather name="check-circle" size={12} color="#9A3412" />
                      <Text className="text-[#9A3412] font-black text-xs ml-1">
                        Set as Active
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="flex-row items-center">
                      <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                      <Text className="text-emerald-700 font-bold text-xs">
                        Currently in service
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── Modal: Create / Edit Vehicle ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 border-t border-gray-150 max-h-[90%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-textPrimary font-black text-lg">
                {editingVehicle ? 'Edit Vehicle Details' : 'Register New Vehicle'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Vehicle Type Pills */}
              <Text className="text-textMuted text-xs font-bold uppercase mb-1.5">
                Vehicle Type *
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {VEHICLE_TYPES.map((t) => {
                  const isSelected = formType === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => setFormType(t.id)}
                      className={`px-3 py-2 rounded-xl flex-row items-center border ${
                        isSelected
                          ? 'bg-orange-50 border-[#9A3412]'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-[#9A3412]' : 'text-gray-700'
                        }`}
                      >
                        {getVehicleIcon(t.id)} {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Make & Model */}
              <Text className="text-textMuted text-xs font-bold uppercase mb-1">
                Make & Model *
              </Text>
              <TextInput
                value={formMakeModel}
                onChangeText={(txt) => {
                  setFormMakeModel(txt);
                  if (formErrors.makeModel) {
                    setFormErrors((prev) => ({ ...prev, makeModel: '' }));
                  }
                }}
                placeholder="e.g. Rad Power E-Bike Pro or Honda Dio"
                className={`bg-gray-50 border rounded-2xl px-4 py-3 text-sm text-textPrimary mb-1 ${
                  formErrors.makeModel ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {formErrors.makeModel ? (
                <Text className="text-red-500 text-[11px] font-semibold mb-2">
                  {formErrors.makeModel}
                </Text>
              ) : (
                <View className="mb-2" />
              )}

              {/* License Plate / Fleet ID */}
              <Text className="text-textMuted text-xs font-bold uppercase mb-1">
                Plate Number / Fleet ID *
              </Text>
              <TextInput
                value={formPlate}
                onChangeText={(txt) => {
                  setFormPlate(txt);
                  if (formErrors.plateNumber) {
                    setFormErrors((prev) => ({ ...prev, plateNumber: '' }));
                  }
                }}
                placeholder="e.g. #EB-4092 or WP-BHM-7821"
                autoCapitalize="characters"
                className={`bg-gray-50 border rounded-2xl px-4 py-3 text-sm text-textPrimary mb-1 ${
                  formErrors.plateNumber ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {formErrors.plateNumber ? (
                <Text className="text-red-500 text-[11px] font-semibold mb-2">
                  {formErrors.plateNumber}
                </Text>
              ) : (
                <View className="mb-2" />
              )}

              {/* Color and Year in a row */}
              <View className="flex-row gap-3 mb-2">
                <View className="flex-1">
                  <Text className="text-textMuted text-xs font-bold uppercase mb-1">
                    Color (Optional)
                  </Text>
                  <TextInput
                    value={formColor}
                    onChangeText={setFormColor}
                    placeholder="e.g. Matte Black"
                    className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-textPrimary"
                  />
                </View>
                <View className="w-32">
                  <Text className="text-textMuted text-xs font-bold uppercase mb-1">
                    Year (Optional)
                  </Text>
                  <TextInput
                    value={formYear}
                    onChangeText={(txt) => {
                      setFormYear(txt);
                      if (formErrors.year) {
                        setFormErrors((prev) => ({ ...prev, year: '' }));
                      }
                    }}
                    placeholder="2023"
                    keyboardType="numeric"
                    maxLength={4}
                    className={`bg-gray-50 border rounded-2xl px-4 py-3 text-sm text-textPrimary ${
                      formErrors.year ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                </View>
              </View>
              {formErrors.year && (
                <Text className="text-red-500 text-[11px] font-semibold mb-2">
                  {formErrors.year}
                </Text>
              )}

              {/* Primary Toggle */}
              <TouchableOpacity
                onPress={() => setFormIsPrimary(!formIsPrimary)}
                activeOpacity={0.8}
                className="flex-row items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-200 my-2"
              >
                <View className="flex-1 mr-3">
                  <Text className="text-textPrimary font-black text-xs">
                    Set as Active Delivery Ride
                  </Text>
                  <Text className="text-textMuted text-[10px] mt-0.5">
                    Will be synced as your active ride for current delivery dispatches.
                  </Text>
                </View>
                <View
                  className={`w-6 h-6 rounded-full items-center justify-center ${
                    formIsPrimary ? 'bg-[#9A3412]' : 'border-2 border-gray-300'
                  }`}
                >
                  {formIsPrimary && <Feather name="check" size={14} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSaveVehicle}
                disabled={submitting}
                className="bg-[#9A3412] py-4 rounded-2xl items-center shadow-md flex-row justify-center mt-3 mb-6"
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white font-black text-sm uppercase tracking-wide">
                    {editingVehicle ? 'Update Vehicle' : 'Save & Register Vehicle'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Delete Confirmation ── */}
      <Modal
        visible={deleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm border border-gray-150 shadow-xl">
            <View className="w-12 h-12 rounded-full bg-red-100 items-center justify-center self-center mb-4">
              <Feather name="trash-2" size={24} color="#DC2626" />
            </View>

            <Text className="text-textPrimary font-black text-center text-lg mb-1">
              Remove Vehicle?
            </Text>
            <Text className="text-textSecondary text-xs text-center leading-5 mb-5">
              Are you sure you want to remove{' '}
              <Text className="font-bold text-textPrimary">
                {vehicleToDelete?.makeModel} ({vehicleToDelete?.plateNumber})
              </Text>{' '}
              from your fleet? Historical delivery records will be preserved.
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setDeleteConfirmVisible(false);
                  setVehicleToDelete(null);
                }}
                disabled={deleting}
                className="flex-1 py-3.5 bg-gray-100 rounded-2xl items-center"
              >
                <Text className="text-textPrimary font-bold text-sm">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmDelete}
                disabled={deleting}
                className="flex-1 py-3.5 bg-[#DC2626] rounded-2xl items-center flex-row justify-center shadow-sm"
              >
                {deleting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white font-black text-sm">Remove</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
