import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Badge } from '../common/Badge';

interface MealCardProps {
  id: string;
  name: string;
  price: number;
  category: string;
  cookName: string;
  avgRating?: number;
  portionsRemaining: number;
  photos?: string[];
  onPress: () => void;
}

export const MealCard: React.FC<MealCardProps> = ({
  name,
  price,
  category,
  cookName,
  avgRating = 0,
  portionsRemaining,
  photos,
  onPress,
}) => {
  const hasPhoto = photos && photos.length > 0;
  const deliveryEst = "25-35 mins";

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-5 animate-fade-in"
      activeOpacity={0.9}
    >
      {/* Banner Image Container */}
      <View className="h-44 bg-primary/10 relative">
        {hasPhoto ? (
          <Image 
            source={{ uri: photos[0] }} 
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center" style={{ width: '100%', height: '100%' }}>
            <Text className="text-5xl">🍛</Text>
          </View>
        )}

        {/* Top-left Category Overlay */}
        <View className="absolute top-4 left-4">
          <Badge label={category || 'Meal'} variant="primary" className="shadow-sm" />
        </View>

        {/* Promo tag Overlay */}
        <View className="absolute bottom-4 left-4 bg-orange-600 rounded-lg px-2.5 py-1 shadow-sm border border-orange-500">
          <Text className="text-white font-black text-[9px] uppercase tracking-wide">🔥 LKR 150 OFF</Text>
        </View>

        {/* Quick info overlay */}
        <View className="absolute bottom-4 right-4 bg-white/95 rounded-lg px-2.5 py-1 shadow-sm flex-row items-center border border-gray-150">
          <Text className="text-textPrimary font-extrabold text-[9px] tracking-wide">🕒 {deliveryEst}</Text>
        </View>
      </View>

      {/* Details Box */}
      <View className="p-4">
        {/* Title and Rating Line */}
        <View className="flex-row justify-between items-start mb-1">
          <Text className="text-textPrimary font-extrabold text-base flex-1 mr-2" numberOfLines={1}>
            {name || 'Delicious Meal'}
          </Text>
          <View className="flex-row items-center bg-amber-50 border border-amber-150 px-2.5 py-0.5 rounded-full shadow-xs">
            <Text className="text-[10px] mr-0.5">⭐</Text>
            <Text className="text-amber-800 font-extrabold text-[10px]">
              {avgRating > 0 ? avgRating.toFixed(1) : 'New'}
            </Text>
          </View>
        </View>

        {/* Cook Details */}
        <Text className="text-textSecondary text-xs mb-3 font-medium">Prepared by: {cookName || 'Local Chef'}</Text>

        {/* Bottom Line: Portions and Price */}
        <View className="flex-row justify-between items-center pt-2.5 border-t border-gray-50">
          <View className="flex-row items-center">
            <View className={`w-2 h-2 rounded-full mr-1.5 ${portionsRemaining > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
            <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wide">
              {portionsRemaining > 0 ? `${portionsRemaining} Portions Left` : 'Sold Out'}
            </Text>
          </View>
          <Text className="text-primary font-black text-base">LKR {price || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
