import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface RiderJobItem {
  id: string;
  orderNumber?: string;
  cookName: string;
  isVerified?: boolean;
  distancePickup?: string;
  estimatedTime?: string;
  payoutAmount: number | string;
  payoutTag?: {
    type: 'ready_now' | 'surge' | 'batch' | 'standard';
    text: string;
  };
  pickupDistance?: string;
  dropoffDistance?: string;
  packageSummary?: {
    label: string;
    value: string;
    isHighlight?: boolean;
  };
  highlightDish?: string;
  imageUrl?: string;
  rawOrder?: any;
}

interface RiderOrderCardProps {
  order?: any;
  job?: RiderJobItem;
  onAccept: () => void;
  accepting?: boolean;
}

export const RiderOrderCard: React.FC<RiderOrderCardProps> = ({
  order,
  job,
  onAccept,
  accepting = false,
}) => {
  // Normalize data whether passed as `job` or raw backend `order`
  const cookName = job?.cookName || order?.cookName || 'Home Kitchen';
  const orderNumber = job?.orderNumber || order?.orderNumber || '';
  
  const payout = job?.payoutAmount !== undefined 
    ? (typeof job.payoutAmount === 'number' ? job.payoutAmount.toFixed(job.payoutAmount % 1 === 0 ? 0 : 2) : job.payoutAmount)
    : order?.riderEarnings 
      ? order.riderEarnings.toFixed(2)
      : order?.totalAmount
        ? Math.max(150, Math.round(order.totalAmount * 0.15)).toFixed(2)
        : '150.00';

  const pickupDistance = job?.pickupDistance || job?.distancePickup || (order?.cookAddressLabel ? 'Kitchen' : 'Pickup');
  const dropoffDistance = job?.dropoffDistance || (order?.address?.label ? (order.address.label.length > 16 ? order.address.label.substring(0, 14) + '...' : order.address.label) : 'Destination');
  const estimatedTime = job?.estimatedTime || 'Ready Now';
  
  const packageLabel = job?.packageSummary?.label || 'Items';
  const packageValue = job?.packageSummary?.value || `${order?.items?.length || 1} Item${(order?.items?.length || 1) > 1 ? 's' : ''}`;
  const isHighlightPackage = job?.packageSummary?.isHighlight || false;

  const highlightDish = job?.highlightDish || (
    order?.items?.[0]
      ? `🍲 ${order.items[0].name}${order.items.length > 1 ? ` (+${order.items.length - 1} more)` : ''}`
      : '🍲 Hot Meal'
  );

  const imageUrl = job?.imageUrl || 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=400&q=80';

  const payoutTag = job?.payoutTag || {
    type: 'ready_now',
    text: 'Ready Now',
  };

  return (
    <View className="bg-white rounded-3xl p-4 mb-3.5 border border-gray-100 shadow-sm">
      {/* ── Top Header Row ── */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          {/* Food / Cook Image */}
          <Image
            source={{ uri: imageUrl }}
            className="w-14 h-14 rounded-2xl bg-gray-100 mr-3"
            resizeMode="cover"
          />

          {/* Kitchen Info */}
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-textPrimary font-extrabold text-base" numberOfLines={1}>
                {cookName}
              </Text>
              {/* Verified Badge */}
              <View className="ml-1.5 w-4 h-4 rounded-full bg-[#B45309] items-center justify-center">
                <Feather name="check" size={10} color="#FFFFFF" />
              </View>
            </View>

            <Text className="text-textMuted text-xs mt-0.5" numberOfLines={1}>
              {pickupDistance} to pickup • {estimatedTime}
            </Text>
          </View>
        </View>

        {/* Payout & Status Tag */}
        <View className="items-end">
          <Text className="text-textPrimary font-black text-lg">
            RS {payout}
          </Text>

          {payoutTag.type === 'ready_now' ? (
            <Text className="text-emerald-600 font-bold text-xs mt-0.5">
              {payoutTag.text}
            </Text>
          ) : payoutTag.type === 'surge' ? (
            <Text className="text-[#C25E00] font-bold text-xs mt-0.5">
              {payoutTag.text}
            </Text>
          ) : payoutTag.type === 'batch' ? (
            <View className="bg-indigo-50 px-2 py-0.5 rounded-md mt-0.5">
              <Text className="text-indigo-600 font-bold text-[10px]">
                {payoutTag.text}
              </Text>
            </View>
          ) : (
            <Text className="text-emerald-600 font-bold text-xs mt-0.5">
              Ready Now
            </Text>
          )}
        </View>
      </View>

      {/* ── 3-Column Stats Pill Bar ── */}
      <View className="bg-[#EEF4FF] rounded-2xl p-3 my-3 flex-row justify-between items-center">
        <View className="flex-1 items-center border-r border-blue-100">
          <Text className="text-textMuted text-[10px] uppercase font-bold tracking-wider mb-0.5">
            Pickup
          </Text>
          <Text className="text-textPrimary font-black text-sm">
            {pickupDistance}
          </Text>
        </View>

        <View className="flex-1 items-center border-r border-blue-100">
          <Text className="text-textMuted text-[10px] uppercase font-bold tracking-wider mb-0.5">
            Dropoff
          </Text>
          <Text className="text-textPrimary font-black text-sm">
            {dropoffDistance}
          </Text>
        </View>

        <View className="flex-1 items-center">
          <Text className="text-textMuted text-[10px] uppercase font-bold tracking-wider mb-0.5">
            {packageLabel}
          </Text>
          <Text
            className={`font-black text-sm ${
              isHighlightPackage ? 'text-[#C25E00]' : 'text-textPrimary'
            }`}
          >
            {packageValue}
          </Text>
        </View>
      </View>

      {/* ── Bottom Action Row ── */}
      <View className="flex-row items-center justify-between pt-0.5">
        <View className="flex-row items-center flex-1 mr-3">
          <Text className="text-textSecondary text-xs font-semibold" numberOfLines={1}>
            {highlightDish}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onAccept}
          disabled={accepting}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`View and accept order from ${cookName}`}
          className="bg-[#E0EAFF] px-4 py-2.5 rounded-xl flex-row items-center"
          style={{ opacity: accepting ? 0.7 : 1 }}
        >
          {accepting ? (
            <ActivityIndicator size="small" color="#1D4ED8" />
          ) : (
            <Text className="text-[#1D4ED8] font-black text-xs">
              View & Accept
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
