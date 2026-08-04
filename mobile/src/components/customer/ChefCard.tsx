import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';

interface ChefCardProps {
  cookId: string;
  name: string;
  avatarUrl?: string;
  rating?: number;
  specialty?: string;
  onPress: () => void;
}

export const ChefCard: React.FC<ChefCardProps> = ({
  name,
  avatarUrl,
  rating = 0,
  specialty = 'Home Cook',
  onPress,
}) => {
  // Generate background color for initials avatar
  const getAvatarBgColor = (char: string) => {
    const code = char.charCodeAt(0) || 0;
    const colors = ['bg-orange-100', 'bg-emerald-100', 'bg-blue-100', 'bg-amber-100', 'bg-rose-100', 'bg-indigo-100'];
    return colors[code % colors.length];
  };

  const getAvatarTextColor = (char: string) => {
    const code = char.charCodeAt(0) || 0;
    const colors = ['text-orange-700', 'text-emerald-700', 'text-blue-700', 'text-amber-700', 'text-rose-700', 'text-indigo-700'];
    return colors[code % colors.length];
  };

  const initial = name ? name.charAt(0).toUpperCase() : 'C';

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-3xl p-4 mr-4 shadow-sm border border-gray-100 items-center w-32"
      activeOpacity={0.8}
    >
      {/* Avatar Container */}
      <View className="relative mb-3">
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: 'rgba(255, 107, 53, 0.2)' }}
            resizeMode="cover"
          />
        ) : (
          <View className={`w-16 h-16 rounded-full items-center justify-center border border-gray-150 shadow-inner ${getAvatarBgColor(initial)}`}>
            <Text className={`text-xl font-black ${getAvatarTextColor(initial)}`}>
              {initial}
            </Text>
          </View>
        )}
        {/* Active status dot */}
        <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm" />
      </View>

      {/* Chef Details */}
      <Text className="text-textPrimary font-extrabold text-xs text-center w-full mb-1" numberOfLines={1}>
        {name || 'Local Chef'}
      </Text>
      
      <Text className="text-textSecondary text-[9px] text-center w-full mb-2 h-6" numberOfLines={2}>
        {specialty}
      </Text>

      {/* Rating badge */}
      <View className="flex-row items-center bg-amber-50 border border-amber-150 px-2 py-0.5 rounded-full shadow-xs">
        <Text className="text-[10px] mr-0.5">⭐</Text>
        <Text className="text-amber-800 font-extrabold text-[9px]">
          {rating > 0 ? rating.toFixed(1) : 'New'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
