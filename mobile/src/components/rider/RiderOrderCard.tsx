import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '../common/Card';

interface RiderOrderCardProps {
  order: {
    id: string;
    orderNumber: string;
    cookName: string;
    items: { name: string; quantity: number }[];
    totalAmount: number;
    riderEarnings?: number;
    address?: { label: string };
  };
  onAccept: () => void;
  accepting: boolean;
}

export const RiderOrderCard: React.FC<RiderOrderCardProps> = ({
  order,
  onAccept,
  accepting,
}) => {
  const itemSummary = order.items
    .slice(0, 2)
    .map((i) => `${i.quantity}× ${i.name}`)
    .join(', ') + (order.items.length > 2 ? ` +${order.items.length - 2} more` : '');

  const estimatedEarnings = order.riderEarnings
    ? order.riderEarnings.toFixed(0)
    : Math.max(150, Math.round(order.totalAmount * 0.15)).toString();

  return (
    <Card elevated bordered className="mb-3">
      {/* Header */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-0.5">
            <View className="w-2 h-2 rounded-full bg-indigo-500 mr-2" />
            <Text className="text-textPrimary font-bold text-sm" numberOfLines={1}>
              {order.cookName}
            </Text>
          </View>
          <Text className="text-textMuted text-xs ml-4">{order.orderNumber}</Text>
        </View>
        {/* Earnings Pill */}
        <View className="bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
          <Text className="text-indigo-700 font-bold text-xs">
            LKR {estimatedEarnings}
          </Text>
        </View>
      </View>

      {/* Items */}
      <Text className="text-textSecondary text-xs mb-3 ml-4" numberOfLines={1}>
        {itemSummary}
      </Text>

      {/* Delivery Location */}
      {order.address?.label ? (
        <View className="flex-row items-center mb-3 ml-1">
          <Feather name="map-pin" size={12} color="#9CA3AF" />
          <Text className="text-textMuted text-xs ml-1.5 flex-1" numberOfLines={1}>
            {order.address.label}
          </Text>
        </View>
      ) : null}

      {/* Divider */}
      <View className="h-px bg-gray-100 mb-3" />

      {/* Order total + Accept button */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-textMuted text-[10px] uppercase tracking-wide font-bold">
            Order Total
          </Text>
          <Text className="text-textPrimary font-bold text-sm">
            LKR {order.totalAmount.toFixed(0)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onAccept}
          disabled={accepting}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Accept delivery from ${order.cookName}`}
          className="bg-indigo-500 flex-row items-center px-5 py-3 rounded-xl"
          style={{ opacity: accepting ? 0.7 : 1 }}
        >
          {accepting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather name="truck" size={14} color="#FFFFFF" />
              <Text className="text-white font-bold text-sm ml-2">Accept</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Card>
  );
};
