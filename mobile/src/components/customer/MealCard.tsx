import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Badge } from '../common/Badge';
import { Ionicons, Feather } from '@expo/vector-icons';

interface MealCardProps {
  id: string;
  name: string;
  price: number;
  category: string;
  cookName: string;
  avgRating?: number;
  portionsRemaining: number;
  photos?: string[];
  layout?: 'grid' | 'full';
  onPress: () => void;
  onAddToCart?: () => void;
}

export const MealCard: React.FC<MealCardProps> = ({
  name,
  price,
  category,
  cookName,
  avgRating = 0,
  portionsRemaining,
  photos,
  layout = 'grid',
  onPress,
  onAddToCart,
}) => {
  const hasPhoto = photos && photos.length > 0;
  const deliveryEst = "25-35 mins";

  if (layout === 'full') {
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
            <View className="w-full h-full items-center justify-center">
              <Feather name="coffee" size={36} color="#FF6B35" />
            </View>
          )}

          {/* Top-left Category Overlay */}
          <View className="absolute top-3 left-3">
            <Badge label={category || 'Meal'} variant="primary" className="shadow-sm" />
          </View>

          {/* Plus Add to Cart Button */}
          {onAddToCart && portionsRemaining > 0 && (
            <TouchableOpacity
              onPress={(e: any) => {
                e.stopPropagation();
                onAddToCart();
              }}
              activeOpacity={0.8}
              className="absolute bottom-3 right-3 bg-primary w-10 h-10 rounded-full items-center justify-center shadow-md border-2 border-white"
            >
              <Feather name="plus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Quick info overlay */}
          <View className="absolute bottom-3 left-3 bg-white/95 rounded-lg px-2 py-0.5 shadow-sm flex-row items-center border border-gray-150">
            <Feather name="clock" size={10} color="#4B5563" className="mr-1" />
            <Text className="text-textPrimary font-extrabold text-[9px] tracking-wide ml-1">{deliveryEst}</Text>
          </View>
        </View>

        {/* Details Box */}
        <View className="p-4">
          <View className="flex-row justify-between items-start mb-1">
            <Text className="text-textPrimary font-extrabold text-base flex-1 mr-2" numberOfLines={1}>
              {name || 'Delicious Meal'}
            </Text>
            <View className="flex-row items-center bg-amber-50 border border-amber-150 px-2 py-0.5 rounded-full shadow-xs">
              <Ionicons name="star" size={10} color="#F59E0B" />
              <Text className="text-amber-800 font-extrabold text-[10px] ml-0.5">
                {avgRating > 0 ? avgRating.toFixed(1) : 'New'}
              </Text>
            </View>
          </View>

          <Text className="text-textSecondary text-xs mb-3 font-medium">Prepared by: {cookName || 'Local Chef'}</Text>

          <View className="flex-row justify-between items-center pt-2.5 border-t border-gray-50">
            <View className="flex-row items-center">
              <View className={`w-2 h-2 rounded-full mr-1.5 ${portionsRemaining > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wide">
                {portionsRemaining > 0 ? `${portionsRemaining} Left` : 'Sold Out'}
              </Text>
            </View>
            <Text className="text-primary font-black text-base">LKR {price || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Side-by-Side Grid Layout (Default for Home Feed)
  return (
    <TouchableOpacity
      onPress={onPress}
      className="w-[48.5%] bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-4 relative flex-col justify-between"
      activeOpacity={0.9}
    >
      {/* Top Banner Image Container */}
      <View className="h-32 bg-primary/10 relative">
        {hasPhoto ? (
          <Image 
            source={{ uri: photos[0] }} 
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Feather name="coffee" size={30} color="#FF6B35" />
          </View>
        )}

        {/* Category Pill Overlay */}
        <View className="absolute top-2 left-2">
          <Badge label={category || 'Meal'} variant="primary" className="shadow-xs" />
        </View>

        {/* Plus Add to Cart Floating Icon */}
        {onAddToCart && portionsRemaining > 0 && (
          <TouchableOpacity
            onPress={(e: any) => {
              e.stopPropagation();
              onAddToCart();
            }}
            activeOpacity={0.8}
            className="absolute bottom-2 right-2 bg-primary w-8 h-8 rounded-full items-center justify-center shadow-md border-2 border-white"
          >
            <Feather name="plus" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Details Section */}
      <View className="p-3 flex-1 justify-between">
        <View>
          <View className="flex-row justify-between items-start mb-0.5">
            <Text className="text-textPrimary font-black text-xs flex-1 mr-1" numberOfLines={1}>
              {name || 'Delicious Meal'}
            </Text>
            <View className="flex-row items-center bg-amber-50 border border-amber-150 px-1.5 py-0.5 rounded-md shadow-2xs">
              <Ionicons name="star" size={9} color="#F59E0B" />
              <Text className="text-amber-800 font-extrabold text-[9px] ml-0.5">
                {avgRating > 0 ? avgRating.toFixed(1) : 'New'}
              </Text>
            </View>
          </View>

          <Text className="text-textSecondary text-[10px] mb-2 font-medium" numberOfLines={1}>
            Chef {cookName || 'Local Cook'}
          </Text>
        </View>

        {/* Price & Stock Line */}
        <View className="pt-2 border-t border-gray-100 flex-row justify-between items-center">
          <View className="flex-row items-center">
            <View className={`w-1.5 h-1.5 rounded-full mr-1 ${portionsRemaining > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
            <Text className="text-textSecondary text-[9px] font-bold uppercase">
              {portionsRemaining > 0 ? `${portionsRemaining} left` : 'Sold out'}
            </Text>
          </View>
          <Text className="text-primary font-black text-xs">LKR {price || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
