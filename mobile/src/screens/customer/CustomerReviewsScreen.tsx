import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { reviewService, CustomerReview } from '../../services/reviewService';

const RATING_LABELS: Record<number, string> = {
  1: '1.0 • Poor 😕',
  2: '2.0 • Fair 🙂',
  3: '3.0 • Good 😋',
  4: '4.0 • Very Good 🌟',
  5: '5.0 • Exceptional! 💖',
};

export const CustomerReviewsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Review Modal state
  const [editingReview, setEditingReview] = useState<CustomerReview | null>(null);
  const [editRating, setEditRating] = useState<number>(0);
  const [editComment, setEditComment] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const fetchReviews = async () => {
    try {
      const data = await reviewService.getMyReviews();
      setReviews(data);
    } catch (error) {
      console.error('Error fetching customer reviews:', error);
      Alert.alert('Error', 'Unable to load your reviews at this time.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchReviews();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReviews();
  }, []);

  const handleOpenEdit = (review: CustomerReview) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment || '');
  };

  const handleSaveEdit = async () => {
    if (!editingReview) return;
    if (editRating < 1 || editRating > 5) {
      Alert.alert('Rating Required', 'Please select a star rating between 1 and 5 stars.');
      return;
    }

    setIsUpdating(true);
    try {
      await reviewService.updateReview(editingReview.id, {
        rating: editRating,
        comment: editComment.trim(),
        photoUrl: editingReview.photoUrl,
      });

      // Optimistically update list
      setReviews((prev) =>
        prev.map((r) =>
          r.id === editingReview.id
            ? { ...r, rating: editRating, comment: editComment.trim(), updatedAt: new Date().toISOString() }
            : r
        )
      );

      setEditingReview(null);
      Alert.alert('Success', 'Your review has been updated!');
    } catch (err: any) {
      console.error('Update review error:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update review.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = (review: CustomerReview) => {
    Alert.alert(
      'Delete Review',
      `Are you sure you want to delete your review for "${review.mealName || 'this meal'}"? This will recalculate the food item's average rating.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await reviewService.deleteReview(review.id);
              setReviews((prev) => prev.filter((r) => r.id !== review.id));
              Alert.alert('Review Deleted', 'Your review has been removed.');
            } catch (err: any) {
              console.error('Delete review error:', err);
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete review.');
            }
          },
        },
      ]
    );
  };

  // Stats
  const totalReviews = reviews.length;
  const avgRatingNumber =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / totalReviews
      : 0;
  const avgRating = avgRatingNumber > 0 ? avgRatingNumber.toFixed(1) : '0.0';

  const renderReviewItem = ({ item }: { item: CustomerReview }) => (
    <View className="bg-white rounded-3xl border border-gray-150 p-5 mb-4 shadow-sm">
      {/* Header: Meal Name & Stars */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-row items-center flex-1 mr-2">
          {item.mealPhoto ? (
            <Image
              source={{ uri: item.mealPhoto }}
              className="w-12 h-12 rounded-2xl mr-3 bg-gray-100 border border-gray-200"
              resizeMode="cover"
            />
          ) : (
            <View className="w-12 h-12 rounded-2xl bg-orange-100 border border-orange-200 items-center justify-center mr-3">
              <Feather name="coffee" size={20} color="#FF6B35" />
            </View>
          )}
          <View className="flex-1">
            <Text className="text-textPrimary font-extrabold text-sm" numberOfLines={1}>
              {item.mealName || 'Home Kitchen Dish'}
            </Text>
            <Text className="text-textMuted text-[10px] font-bold mt-0.5">
              Reviewed on{' '}
              {item.createdAt
                ? new Date(item.createdAt).toLocaleDateString('en-LK', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Recent'}
            </Text>
          </View>
        </View>

        {/* Star Badge */}
        <View className="flex-row bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full items-center">
          <Ionicons name="star" size={11} color="#F59E0B" style={{ marginRight: 3 }} />
          <Text className="text-amber-800 font-extrabold text-xs">
            {Number(item.rating).toFixed(1)}
          </Text>
        </View>
      </View>

      {/* Review Comment */}
      {item.comment ? (
        <Text className="text-textSecondary text-xs leading-relaxed font-medium mb-3">
          "{item.comment}"
        </Text>
      ) : (
        <Text className="text-textMuted text-xs italic mb-3">No written comment provided</Text>
      )}

      {/* Optional Attached Food Photo */}
      {item.photoUrl ? (
        <View className="rounded-2xl h-44 overflow-hidden bg-gray-50 border border-gray-150 mb-3">
          <Image source={{ uri: item.photoUrl }} className="w-full h-full" resizeMode="cover" />
        </View>
      ) : null}

      {/* Action Buttons Row */}
      <View className="flex-row justify-end items-center gap-2 pt-3 border-t border-gray-100">
        <TouchableOpacity
          onPress={() => handleOpenEdit(item)}
          className="px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 flex-row items-center gap-1.5 shadow-xs"
          activeOpacity={0.7}
        >
          <Feather name="edit-2" size={12} color="#1A1A2E" />
          <Text className="text-textPrimary font-extrabold text-xs">Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleDelete(item)}
          className="px-3.5 py-2 rounded-xl bg-red-50 border border-red-150 flex-row items-center gap-1.5 shadow-xs"
          activeOpacity={0.7}
        >
          <Feather name="trash-2" size={12} color="#EF4444" />
          <Text className="text-red-600 font-extrabold text-xs">Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* Sticky Header */}
      <View
        className={`bg-white px-6 ${
          Platform.OS === 'ios' ? 'pt-14' : 'pt-12'
        } pb-4 border-b border-gray-100 shadow-sm z-10 flex-row justify-between items-center`}
      >
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3 border border-gray-200"
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={20} color="#1A1A2E" />
          </TouchableOpacity>
          <View>
            <Text className="font-black text-xl text-textPrimary">My Reviews</Text>
            <Text className="text-textSecondary text-[10px] font-bold uppercase tracking-wider">
              Manage your feedback
            </Text>
          </View>
        </View>

        <View className="bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
          <Text className="text-primary font-black text-[9px] uppercase tracking-wider">
            {totalReviews} {totalReviews === 1 ? 'Review' : 'Reviews'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text className="text-textMuted text-xs font-semibold mt-3">Loading your reviews...</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={renderReviewItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF6B35"
              colors={['#FF6B35']}
            />
          }
          ListHeaderComponent={
            totalReviews > 0 ? (
              <View className="mb-6 bg-white border border-gray-100 rounded-3xl p-5 shadow-sm flex-row items-center justify-around">
                <View className="items-center">
                  <Text className="text-textPrimary font-black text-3xl">{totalReviews}</Text>
                  <Text className="text-[9px] font-black uppercase tracking-wider text-textSecondary mt-1">
                    Meals Reviewed
                  </Text>
                </View>

                <View className="h-10 w-[1px] bg-gray-200" />

                <View className="items-center">
                  <View className="flex-row items-center">
                    <Ionicons name="star" size={20} color="#F59E0B" style={{ marginRight: 4 }} />
                    <Text className="text-textPrimary font-black text-3xl">{avgRating}</Text>
                  </View>
                  <Text className="text-[9px] font-black uppercase tracking-wider text-textSecondary mt-1">
                    Your Avg Rating
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="py-16 items-center px-6">
              <Text className="text-5xl mb-4">🍽️</Text>
              <Text className="text-textPrimary font-extrabold text-base text-center mb-1">
                No Reviews Submitted Yet
              </Text>
              <Text className="text-textMuted text-xs text-center leading-relaxed mb-6">
                When you order from local home chefs and receive your delivered food, you can leave ratings and feedback right here!
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Orders')}
                className="bg-primary px-6 py-3 rounded-2xl shadow-sm"
                activeOpacity={0.8}
              >
                <Text className="text-white font-black text-xs uppercase tracking-wider">
                  Check Delivered Orders
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Edit Review Modal */}
      <Modal
        visible={!!editingReview}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingReview(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/60"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setEditingReview(null)}
            className="flex-1"
          />

          <View className="bg-white rounded-t-[36px] w-full max-h-[85%] border-t border-gray-150 flex-col shadow-2xl">
            {/* Pull Bar */}
            <View className="items-center pt-3 pb-1">
              <View className="w-12 h-1.5 rounded-full bg-gray-200" />
            </View>

            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
              <View className="flex-1 mr-3">
                <Text className="text-textPrimary font-black text-lg">Edit Your Review</Text>
                <Text className="text-textSecondary text-[11px] font-semibold mt-0.5" numberOfLines={1}>
                  {editingReview?.mealName || 'Food Item'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditingReview(null)}
                className="bg-gray-100 rounded-full w-8 h-8 items-center justify-center border border-gray-200"
              >
                <Feather name="x" size={15} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Star Rating Section */}
              <View className="items-center py-4 bg-gray-50/80 rounded-3xl border border-gray-150 mb-5">
                <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-2">
                  Update Rating *
                </Text>

                <View className="flex-row items-center gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const isFilled = editRating >= starValue;
                    return (
                      <TouchableOpacity
                        key={starValue}
                        onPress={() => setEditRating(starValue)}
                        className="p-1.5"
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isFilled ? 'star' : 'star-outline'}
                          size={36}
                          color={isFilled ? '#F59E0B' : '#D1D5DB'}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text className="text-xs font-black text-amber-800">
                  {editRating > 0 ? RATING_LABELS[editRating] : 'Select rating'}
                </Text>
              </View>

              {/* Comment Section */}
              <View className="mb-6">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-textMuted text-[10px] font-black uppercase tracking-wider">
                    Your Comments
                  </Text>
                  <Text className="text-textMuted text-[10px] font-semibold">
                    {editComment.length}/500
                  </Text>
                </View>

                <TextInput
                  value={editComment}
                  onChangeText={setEditComment}
                  placeholder="Update your review feedback..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  maxLength={500}
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-xs text-textPrimary leading-relaxed font-medium min-h-[96px]"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={isUpdating || editRating === 0}
                className={`rounded-2xl py-4 items-center shadow-md flex-row justify-center gap-2 ${
                  isUpdating || editRating === 0 ? 'bg-gray-200' : 'bg-primary'
                }`}
                activeOpacity={0.85}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#FFFFFF" />
                    <Text className="font-black text-xs uppercase tracking-wider text-white">
                      Save Changes
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};
