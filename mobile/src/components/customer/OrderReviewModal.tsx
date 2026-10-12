import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { reviewService } from '../../services/reviewService';
import { pickImageFromGallery, uploadImageToImgBB } from '../../services/imageService';

interface OrderReviewModalProps {
  visible: boolean;
  order: any;
  onClose: () => void;
  onSuccess?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: '1.0 • Poor 😕',
  2: '2.0 • Fair 🙂',
  3: '3.0 • Good 😋',
  4: '4.0 • Very Good 🌟',
  5: '5.0 • Exceptional! 💖',
};

export const OrderReviewModal: React.FC<OrderReviewModalProps> = ({
  visible,
  order,
  onClose,
  onSuccess,
}) => {
  const [selectedMealId, setSelectedMealId] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [photoUri, setPhotoUri] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [existingReviews, setExistingReviews] = useState<any[]>([]);
  const [isLoadingOrderReviews, setIsLoadingOrderReviews] = useState<boolean>(false);

  // Initialize or reset when order changes or modal opens
  useEffect(() => {
    if (visible && order) {
      const items = order.items || [];
      const firstMealId = items[0]?.mealId || items[0]?.id || '';
      setSelectedMealId(firstMealId);
      setRating(0);
      setComment('');
      setPhotoUri('');
      fetchOrderReviews(order.id, firstMealId);
    }
  }, [visible, order]);

  // Fetch reviews already submitted for this order
  const fetchOrderReviews = async (orderId: string, currentMealId?: string) => {
    if (!orderId) return;
    setIsLoadingOrderReviews(true);
    try {
      const reviews = await reviewService.getReviewsByOrder(orderId);
      setExistingReviews(reviews || []);

      // If current meal was already reviewed, prefill
      const targetMealId = currentMealId || selectedMealId;
      const matched = (reviews || []).find((r: any) => r.mealId === targetMealId);
      if (matched) {
        setRating(matched.rating || 0);
        setComment(matched.comment || '');
        setPhotoUri(matched.photoUrl || '');
      }
    } catch (err) {
      console.warn('Failed to fetch order reviews:', err);
    } finally {
      setIsLoadingOrderReviews(false);
    }
  };

  const handleSelectMeal = (mealId: string) => {
    setSelectedMealId(mealId);
    const matched = existingReviews.find((r: any) => r.mealId === mealId);
    if (matched) {
      setRating(matched.rating || 0);
      setComment(matched.comment || '');
      setPhotoUri(matched.photoUrl || '');
    } else {
      setRating(0);
      setComment('');
      setPhotoUri('');
    }
  };

  const handlePickPhoto = async () => {
    try {
      const asset = await pickImageFromGallery();
      if (!asset) return;
      setIsUploadingPhoto(true);
      const cdnUrl = await uploadImageToImgBB(asset.uri);
      setPhotoUri(cdnUrl);
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'Could not upload food image.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUri('');
  };

  const handleSubmit = async () => {
    if (!order) return;

    if (!selectedMealId) {
      Alert.alert('Select Dish', 'Please select a food item to review.');
      return;
    }

    if (rating < 1 || rating > 5) {
      Alert.alert('Rating Required', 'Please select a star rating between 1 and 5 stars.');
      return;
    }

    setIsSubmitting(true);
    try {
      await reviewService.submitReview({
        orderId: order.id,
        mealId: selectedMealId,
        rating,
        comment: comment.trim(),
        photoUrl: photoUri || undefined,
      });

      Alert.alert('Review Submitted! 🎉', 'Thank you for sharing your feedback with the community!', [
        {
          text: 'OK',
          onPress: () => {
            onClose();
            if (onSuccess) onSuccess();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Submit review error:', error, error?.response?.data);
      const serverMsg = error?.response?.data?.message || error?.response?.data?.error;
      const message = serverMsg || 'Failed to submit review. Please try again.';
      Alert.alert('Submission Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!order) return null;

  const items = order.items || [];
  const activeMeal = items.find((i: any) => i.mealId === selectedMealId) || items[0];
  const isEditing = existingReviews.some((r: any) => r.mealId === selectedMealId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/60"
      >
        <TouchableOpacity activeOpacity={1} onPress={onClose} className="flex-1" />

        <View className="bg-white rounded-t-[36px] w-full max-h-[90%] border-t border-gray-150 flex-col shadow-2xl">
          {/* Pull Bar */}
          <View className="items-center pt-3 pb-1">
            <View className="w-12 h-1.5 rounded-full bg-gray-200" />
          </View>

          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
            <View className="flex-1 mr-3">
              <Text className="text-textPrimary font-black text-xl">
                {isEditing ? 'Update Review' : 'Rate Your Meal'}
              </Text>
              <Text className="text-textSecondary text-[11px] font-semibold mt-0.5">
                Order #{order.orderNumber || order.id.slice(-6).toUpperCase()} • {order.cookName || 'Home Kitchen'}
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
            {/* Dish Selector (when order contains multiple items) */}
            {items.length > 1 && (
              <View className="mb-5">
                <Text className="text-textMuted text-[10px] font-black uppercase tracking-wider mb-2.5">
                  Select Dish to Review ({items.length} items)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                  {items.map((item: any) => {
                    const mealId = item.mealId || item.id || '';
                    const isSelected = mealId === selectedMealId;
                    const alreadyReviewed = existingReviews.some((r: any) => r.mealId === mealId);
                    return (
                      <TouchableOpacity
                        key={mealId || Math.random().toString()}
                        onPress={() => handleSelectMeal(mealId)}
                        className={`px-3.5 py-2 rounded-2xl border flex-row items-center gap-1.5 ${
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
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        {alreadyReviewed && (
                          <View className="bg-amber-100 px-1.5 py-0.5 rounded-full">
                            <Text className="text-amber-800 text-[9px] font-black">★ Done</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Currently Selected Meal Preview Card */}
            {activeMeal && (
              <View className="bg-orange-50/60 border border-orange-100 rounded-2xl p-3.5 mb-5 flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-orange-100 items-center justify-center mr-3 border border-orange-200">
                  <Feather name="coffee" size={18} color="#FF6B35" />
                </View>
                <View className="flex-1">
                  <Text className="text-textPrimary font-extrabold text-sm" numberOfLines={1}>
                    {activeMeal.name}
                  </Text>
                  <Text className="text-textSecondary text-[10px] font-medium mt-0.5">
                    Portion(s): {activeMeal.quantity || 1} • LKR {activeMeal.price?.toLocaleString()}
                  </Text>
                </View>
                {isEditing && (
                  <View className="bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                    <Text className="text-amber-700 text-[9px] font-black uppercase tracking-wider">
                      Editing
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Star Rating Section */}
            <View className="items-center py-4 bg-gray-50/80 rounded-3xl border border-gray-150 mb-6">
              <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-2">
                OVERALL RATING *
              </Text>

              {/* 5 Interactive Stars */}
              <View className="flex-row items-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isFilled = rating >= starValue;
                  return (
                    <TouchableOpacity
                      key={starValue}
                      onPress={() => setRating(starValue)}
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

              {/* Rating Label */}
              <Text
                className={`text-xs font-black ${
                  rating > 0 ? 'text-amber-800' : 'text-textMuted'
                }`}
              >
                {rating > 0 ? RATING_LABELS[rating] : 'Tap stars to rate (Required)'}
              </Text>
            </View>

            {/* Feedback Comment Section */}
            <View className="mb-5">
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="text-textMuted text-[10px] font-black uppercase tracking-wider">
                  Your Review (Optional)
                </Text>
                <Text className="text-textMuted text-[10px] font-semibold">
                  {comment.length}/500
                </Text>
              </View>

              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Share your experience! How was the flavor, warmth, packaging, and portion size?"
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={500}
                numberOfLines={4}
                textAlignVertical="top"
                className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-xs text-textPrimary leading-relaxed font-medium min-h-[96px]"
              />
            </View>

            {/* Food Photo Upload Section */}
            <View className="mb-6">
              <Text className="text-textMuted text-[10px] font-black uppercase tracking-wider mb-2">
                Add a Dish Photo (Optional)
              </Text>

              {photoUri ? (
                <View className="relative rounded-2xl overflow-hidden border border-gray-200 h-44 bg-gray-50">
                  <Image source={{ uri: photoUri }} className="w-full h-full" resizeMode="cover" />
                  <TouchableOpacity
                    onPress={handleRemovePhoto}
                    className="absolute top-2.5 right-2.5 bg-black/60 rounded-full p-1.5 border border-white/40"
                    activeOpacity={0.8}
                  >
                    <Feather name="trash-2" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handlePickPhoto}
                  disabled={isUploadingPhoto}
                  className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-4 items-center justify-center flex-row gap-2.5"
                  activeOpacity={0.7}
                >
                  {isUploadingPhoto ? (
                    <ActivityIndicator size="small" color="#FF6B35" />
                  ) : (
                    <>
                      <Feather name="camera" size={18} color="#FF6B35" />
                      <Text className="text-textSecondary font-bold text-xs">
                        Upload food photo from gallery
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Submit Action Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting || rating === 0 || isUploadingPhoto}
              className={`rounded-2xl py-4 items-center shadow-md flex-row justify-center gap-2 ${
                rating === 0 || isSubmitting
                  ? 'bg-gray-200'
                  : 'bg-primary shadow-primary/30'
              }`}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={15} color="#FFFFFF" />
                  <Text
                    className={`font-black text-xs uppercase tracking-wider ${
                      rating === 0 ? 'text-gray-400' : 'text-white'
                    }`}
                  >
                    {isEditing ? 'Save Updated Review' : 'Submit Review'}
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
