import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Feather, Ionicons } from '@expo/vector-icons';

export const CookReviewsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReviews = async () => {
    if (!user?.id) return;
    try {
      const response = await api.get(`/api/reviews/cook/${user.id}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReviews();
  }, [user]);

  const getInitials = (nameStr: string) => {
    return nameStr ? nameStr.charAt(0).toUpperCase() : 'N';
  };

  // Summary calculations
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : '0.0';

  const starCounts = [0, 0, 0, 0, 0]; // index 0 = 5 star, 1 = 4 star etc
  reviews.forEach(r => {
    const starIdx = 5 - r.rating;
    if (starIdx >= 0 && starIdx < 5) {
      starCounts[starIdx]++;
    }
  });

  const renderReviewItem = ({ item }: { item: any }) => (
    <View className="bg-white rounded-3xl border border-gray-150 p-5 mb-4 shadow-sm">
      {/* Reviewer Header */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-row items-center flex-1 mr-2">
          <View className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 items-center justify-center mr-3 shadow-inner">
            <Text className="text-secondary font-black text-xs">{getInitials(item.customerName)}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-textPrimary font-extrabold text-sm">{item.customerName}</Text>
            <Text className="text-textMuted text-[9px] font-bold mt-0.5">
              {new Date(item.createdAt).toLocaleDateString('en-LK', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </Text>
          </View>
        </View>
        
        {/* Star rating display */}
        <View className="flex-row bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full items-center">
          <Text className="text-[10px] mr-1">⭐</Text>
          <Text className="text-amber-800 font-extrabold text-[10px]">{item.rating}.0</Text>
        </View>
      </View>

      {/* Review Comment */}
      {item.comment ? (
        <Text className="text-textSecondary text-xs leading-relaxed font-medium mb-3">
          "{item.comment}"
        </Text>
      ) : (
        <Text className="text-textMuted text-xs italic mb-3">No description provided</Text>
      )}

      {/* Review Photo (Optional) */}
      {item.photoUrl ? (
        <View className="rounded-2xl h-44 overflow-hidden bg-gray-50 border border-gray-100 mb-2">
          <Image source={{ uri: item.photoUrl }} className="w-full h-full" resizeMode="cover" />
        </View>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* Premium Header */}
      <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-100 shadow-sm z-10 flex-row justify-between items-center">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3 border border-gray-150">
            <Feather name="chevron-left" size={18} color="#1A1A2E" />
          </TouchableOpacity>
          <Text className="font-black text-xl text-textPrimary">Customer Reviews</Text>
        </View>
        <View className="bg-secondary/10 border border-secondary/20 rounded-full px-2.5 py-1">
          <Text className="text-secondary font-black text-[9px] uppercase tracking-wider">Kitchen Feed</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2D6A4F" />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={renderReviewItem}
          contentContainerStyle={{ padding: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D6A4F" colors={['#2D6A4F']} />
          }
          ListHeaderComponent={
            <View className="mb-6 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex-row items-center">
              {/* Rating Big Number */}
              <View className="items-center justify-center pr-6 border-r border-gray-100 w-24">
                <Text className="text-textPrimary font-black text-4xl">{avgRating}</Text>
                <Text className="text-[9px] font-black uppercase text-textSecondary tracking-wider mt-1">AVERAGE</Text>
                <View className="flex-row mt-1.5">
                  {Array.from({ length: Math.round(Number(avgRating)) }).map((_, i) => (
                    <Text key={i} className="text-[10px]">⭐</Text>
                  ))}
                </View>
              </View>

              {/* Rating Bars */}
              <View className="flex-1 pl-6">
                {[5, 4, 3, 2, 1].map((stars, idx) => {
                  const count = starCounts[idx];
                  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <View key={stars} className="flex-row items-center mb-1">
                      <Text className="text-[9px] font-bold text-textSecondary w-4 mr-2">{stars}★</Text>
                      <View className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden mr-2">
                        <View className="h-full bg-amber-400 rounded-full" style={{ width: `${percentage}%` }} />
                      </View>
                      <Text className="text-[9px] font-bold text-textMuted w-4 text-right">{count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View className="py-12 items-center">
              <Text className="text-5xl mb-4">⭐</Text>
              <Text className="text-textPrimary font-bold text-base mb-1">No reviews yet</Text>
              <Text className="text-textMuted text-xs text-center px-6 leading-relaxed">
                When customers complete orders from your kitchen, their star ratings and photos will appear here!
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};
