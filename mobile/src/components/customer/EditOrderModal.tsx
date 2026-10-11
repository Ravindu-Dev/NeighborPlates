import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '../../services/api';

interface EditOrderModalProps {
  visible: boolean;
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}

const DELIVERY_METHODS = [
  { id: 'RIDER', label: '🛵 Courier Delivery' },
  { id: 'PICKUP', label: '🛍️ Self Pickup' },
  { id: 'COOK_DELIVERY', label: '👨‍🍳 Chef Delivery' },
];

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  visible,
  order,
  onClose,
  onSuccess,
}) => {
  const [addressLabel, setAddressLabel] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('RIDER');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && order) {
      setAddressLabel(order.address?.label || '');
      setSpecialInstructions(order.specialInstructions || '');
      setDeliveryMethod(order.deliveryMethod || 'RIDER');
    }
  }, [visible, order]);

  const handleSave = async () => {
    if (!order) return;
    if (!addressLabel.trim() && deliveryMethod !== 'PICKUP') {
      Alert.alert('Address Required', 'Please provide a valid delivery address.');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/api/orders/${order.id}`, {
        specialInstructions: specialInstructions.trim(),
        deliveryMethod,
        address: {
          label: addressLabel.trim() || 'Self Pickup at Kitchen',
          coordinates: order.address?.coordinates || [79.8612, 6.9271],
        },
      });

      Alert.alert('Order Updated! ✅', 'Your delivery details have been saved for this order.', [
        {
          text: 'OK',
          onPress: () => {
            onClose();
            onSuccess();
          },
        },
      ]);
    } catch (err: any) {
      console.error('Update order error:', err);
      const msg = err?.response?.data?.message || 'Failed to update order details. Please try again.';
      Alert.alert('Update Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  if (!order) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/60"
      >
        <TouchableOpacity activeOpacity={1} onPress={onClose} className="flex-1" />

        <View className="bg-white rounded-t-[36px] w-full max-h-[85%] border-t border-gray-150 flex-col shadow-2xl">
          {/* Pull Bar */}
          <View className="items-center pt-3 pb-1">
            <View className="w-12 h-1.5 rounded-full bg-gray-200" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
            <View className="flex-1 mr-3">
              <Text className="text-textPrimary font-black text-xl">Modify Pending Order</Text>
              <Text className="text-textSecondary text-[11px] font-semibold mt-0.5">
                #{order.orderNumber || order.id?.slice(-6).toUpperCase()} • {order.cookName || 'Home Kitchen'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="bg-gray-100 rounded-full w-8 h-8 items-center justify-center border border-gray-200"
              activeOpacity={0.7}
            >
              <Feather name="x" size={15} color="#4B5563" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Info notice */}
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-5 flex-row items-center">
              <Feather name="info" size={16} color="#D97706" style={{ marginRight: 10 }} />
              <Text className="text-amber-800 text-xs font-semibold flex-1 leading-relaxed">
                You can adjust delivery preferences and notes while the order is waiting for kitchen confirmation.
              </Text>
            </View>

            {/* Delivery Method Selector */}
            <View className="mb-5">
              <Text className="text-textMuted text-[10px] font-black uppercase tracking-wider mb-2">
                Delivery Method
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {DELIVERY_METHODS.map((method) => {
                  const isSelected = deliveryMethod === method.id;
                  return (
                    <TouchableOpacity
                      key={method.id}
                      onPress={() => setDeliveryMethod(method.id)}
                      className={`px-3.5 py-2.5 rounded-2xl border ${
                        isSelected
                          ? 'bg-primary/10 border-primary'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                      activeOpacity={0.8}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-primary' : 'text-textPrimary'
                        }`}
                      >
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Delivery Address Input */}
            {deliveryMethod !== 'PICKUP' && (
              <View className="mb-5">
                <Text className="text-textMuted text-[10px] font-black uppercase tracking-wider mb-2">
                  Delivery Destination
                </Text>
                <TextInput
                  value={addressLabel}
                  onChangeText={setAddressLabel}
                  placeholder="e.g. 45/B Flower Road, Colombo 03"
                  placeholderTextColor="#9CA3AF"
                  className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs text-textPrimary font-semibold"
                />
              </View>
            )}

            {/* Special Instructions Input */}
            <View className="mb-6">
              <Text className="text-textMuted text-[10px] font-black uppercase tracking-wider mb-2">
                Special Kitchen / Delivery Notes
              </Text>
              <TextInput
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
                placeholder="e.g. Please make it less spicy, call before delivery, leave at security gate..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs text-textPrimary leading-relaxed font-medium min-h-[85px]"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              className={`rounded-2xl py-4 items-center shadow-md flex-row justify-center gap-2 ${
                saving ? 'bg-gray-200' : 'bg-primary'
              }`}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="check-circle" size={16} color="#FFFFFF" />
                  <Text className="text-white font-black text-xs uppercase tracking-wider">
                    Save Order Changes
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
