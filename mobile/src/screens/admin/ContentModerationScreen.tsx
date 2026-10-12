import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, Alert,
  TouchableOpacity, RefreshControl, Image, Modal, ScrollView
} from 'react-native';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { Feather } from '@expo/vector-icons';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { SearchBar } from '../../components/admin/SearchBar';

type ContentTab = 'meals' | 'flagged' | 'all';
type RatingFilter = 'all' | '1' | '2' | '3' | '4' | '5';
type MealStatusFilter = 'all' | 'active' | 'inactive';

const renderStars = (rating: number) => {
  const filled = Math.max(0, Math.min(5, rating));
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
};

export const ContentModerationScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ContentTab>('meals');
  const [meals, setMeals] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFirstLoad = useRef(true);

  // Meal filters
  const [mealSearch, setMealSearch] = useState('');
  const [mealStatusFilter, setMealStatusFilter] = useState<MealStatusFilter>('all');

  // Review filters
  const [reviewSearch, setReviewSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [sortNewest, setSortNewest] = useState(true);

  // Detail modals
  const [selectedMeal, setSelectedMeal] = useState<any | null>(null);
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const fetchMeals = async () => {
    try {
      const response = await api.get('/api/admin/meals');
      setMeals(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch meal listings.');
    }
  };

  const fetchReviews = async () => {
    try {
      const url = activeTab === 'flagged' ? '/api/admin/reviews?flagged=true' : '/api/admin/reviews';
      const response = await api.get(url);
      setReviews(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch reviews.');
    }
  };

  const fetchData = async () => {
    if (isFirstLoad.current) setLoading(true);
    if (activeTab === 'meals') {
      await fetchMeals();
    } else {
      await fetchReviews();
    }
    setLoading(false);
    isFirstLoad.current = false;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleToggleMeal = (meal: any) => {
    const willActivate = !meal.active;
    Alert.alert(
      willActivate ? 'Activate Meal Listing' : 'Suspend Meal Listing',
      willActivate
        ? `"${meal.name}" will be visible and available for ordering again.`
        : `"${meal.name}" will be hidden from the platform and cannot be ordered.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: willActivate ? 'Activate' : 'Suspend',
          style: willActivate ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await api.put(`/api/admin/meals/${meal.id}/toggle-active`);
              setSelectedMeal(null);
              fetchMeals();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to update meal status.');
            }
          },
        },
      ]
    );
  };

  const handleDismissFlag = (reviewId: string) => {
    Alert.alert(
      'Dismiss Flag',
      'This will clear the flag and mark the review as acceptable. The review will remain visible on the platform.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss Flag',
          onPress: async () => {
            try {
              await api.put(`/api/admin/reviews/${reviewId}/dismiss-flag`);
              setSelectedReview(null);
              fetchReviews();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to dismiss flag.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteReview = (review: any) => {
    Alert.alert(
      '⚠️ Permanently Delete Review',
      `This will permanently delete "${review.customerName}"'s review and recalculate meal and cook ratings. This action CANNOT be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/reviews/${review.id}`);
              setSelectedReview(null);
              fetchReviews();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete review.');
            }
          },
        },
      ]
    );
  };

  const filteredMeals = useMemo(() => {
    let list = meals;
    if (mealSearch.trim()) {
      const q = mealSearch.toLowerCase();
      list = list.filter(
        (m: any) =>
          m.name?.toLowerCase().includes(q) ||
          m.cookId?.toLowerCase().includes(q) ||
          m.category?.toLowerCase().includes(q)
      );
    }
    if (mealStatusFilter !== 'all') {
      list = list.filter((m: any) =>
        mealStatusFilter === 'active' ? m.active !== false : m.active === false
      );
    }
    return list;
  }, [meals, mealSearch, mealStatusFilter]);

  const filteredReviews = useMemo(() => {
    let list = reviews;
    if (reviewSearch.trim()) {
      const q = reviewSearch.toLowerCase();
      list = list.filter(
        (r: any) =>
          r.customerName?.toLowerCase().includes(q) ||
          r.mealName?.toLowerCase().includes(q) ||
          r.comment?.toLowerCase().includes(q)
      );
    }
    if (ratingFilter !== 'all') {
      list = list.filter((r: any) => String(r.rating) === ratingFilter);
    }
    if (sortNewest) {
      list = [...list].sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else {
      list = [...list].sort(
        (a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }
    return list;
  }, [reviews, reviewSearch, ratingFilter, sortNewest]);

  const activeMeals = meals.filter((m: any) => m.active !== false).length;
  const flaggedCount = reviews.filter((r: any) => r.flagged).length;

  const tabConfig = [
    { id: 'meals' as ContentTab, label: 'Meals', count: meals.length },
    { id: 'flagged' as ContentTab, label: 'Flagged', count: 0 },
    { id: 'all' as ContentTab, label: 'All Reviews', count: 0 },
  ];

  const renderMealCard = ({ item }: { item: any }) => (
    <Card className="mb-3 overflow-hidden" bordered>
      <TouchableOpacity onPress={() => setSelectedMeal(item)} activeOpacity={0.8}>
        <View className="flex-row items-start mb-3">
          {/* Meal Image */}
          {item.photos?.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSelectedImageUrl(item.photos[0])}
              className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 mr-3 border border-gray-200"
              activeOpacity={0.85}
            >
              <Image source={{ uri: item.photos[0] }} className="w-full h-full" resizeMode="cover" />
            </TouchableOpacity>
          ) : (
            <View className="w-16 h-16 rounded-xl bg-orange-50 border border-orange-100 mr-3 items-center justify-center">
              <Feather name="coffee" size={22} color="#FB923C" />
            </View>
          )}

          <View className="flex-1">
            <Text className="text-textPrimary font-extrabold text-sm" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-textSecondary text-xs mt-0.5">
              {item.category || 'Uncategorized'}
              {item.cuisineType ? ` · ${item.cuisineType}` : ''}
            </Text>
            <Text className="text-primary font-bold text-xs mt-1">
              LKR {item.price?.toFixed(2)}
            </Text>
            {item.avgRating > 0 && (
              <Text className="text-amber-500 text-xs font-bold mt-0.5">
                ⭐ {item.avgRating?.toFixed(1)} ({item.totalOrders || 0} orders)
              </Text>
            )}
          </View>

          <Badge
            label={item.active !== false ? 'Active' : 'Suspended'}
            variant={item.active !== false ? 'success' : 'error'}
          />
        </View>

        {item.description ? (
          <Text className="text-textMuted text-xs leading-relaxed mb-3" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View className="flex-row items-center justify-between">
          <Text className="text-textMuted text-[10px]">
            {item.portionsRemaining > 0 ? `${item.portionsRemaining} portions left` : 'Unlimited'}
          </Text>
          <View className="flex-row items-center">
            <Feather name="info" size={11} color="#FF6B35" />
            <Text className="text-primary text-[10px] font-bold ml-1">Tap for details</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View className="border-t border-gray-100 pt-3 mt-3">
        <Button
          title={item.active !== false ? 'SUSPEND LISTING' : 'ACTIVATE LISTING'}
          onPress={() => handleToggleMeal(item)}
          variant={item.active !== false ? 'outline' : 'primary'}
          size="sm"
        />
      </View>
    </Card>
  );

  const renderReviewCard = ({ item }: { item: any }) => (
    <Card className={`mb-3 border-l-4 overflow-hidden ${item.flagged ? 'border-l-red-500' : 'border-l-gray-200'}`} bordered>
      <TouchableOpacity onPress={() => setSelectedReview(item)} activeOpacity={0.8}>
        <View className="flex-row items-start mb-2">
          <View className="flex-1 mr-2">
            <Text className="text-textPrimary font-extrabold text-sm">
              {item.customerName || 'Anonymous'}
            </Text>
            {item.mealName && (
              <Text className="text-textSecondary text-[11px] mt-0.5" numberOfLines={1}>
                on &ldquo;{item.mealName}&rdquo;
              </Text>
            )}
            <Text className="text-amber-500 text-sm font-bold mt-0.5 tracking-wider">
              {renderStars(item.rating)}
            </Text>
          </View>
          <View className="items-end">
            <Badge label={item.flagged ? 'Flagged' : 'Active'} variant={item.flagged ? 'error' : 'success'} />
            <Text className="text-textMuted text-[10px] mt-1">
              {item.createdAt
                ? new Date(item.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                  })
                : ''}
            </Text>
          </View>
        </View>

        {item.comment ? (
          <Text className="text-textSecondary text-xs leading-relaxed mb-2" numberOfLines={3}>
            &ldquo;{item.comment}&rdquo;
          </Text>
        ) : (
          <Text className="text-textMuted text-xs italic mb-2">No comment provided</Text>
        )}

        {item.photoUrl && (
          <TouchableOpacity
            onPress={() => setSelectedImageUrl(item.photoUrl)}
            className="rounded-xl h-32 overflow-hidden bg-gray-100 border border-gray-200 mb-2"
            activeOpacity={0.85}
          >
            <Image source={{ uri: item.photoUrl }} className="w-full h-full" resizeMode="cover" />
          </TouchableOpacity>
        )}

        {item.flagged && item.flaggedReason && (
          <View className="bg-red-50 px-3 py-2 rounded-xl border border-red-100 mb-2 flex-row items-start">
            <Feather name="alert-triangle" size={12} color="#EF4444" className="mt-0.5" />
            <Text className="text-red-600 text-xs ml-2 font-medium flex-1 leading-relaxed">
              <Text className="font-bold">Flag Reason: </Text>
              {item.flaggedReason}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <View className="flex-row gap-2 border-t border-gray-100 pt-3 mt-1">
        {item.flagged && (
          <Button
            title="DISMISS FLAG"
            onPress={() => handleDismissFlag(item.id)}
            variant="outline"
            size="sm"
            className="flex-1"
          />
        )}
        <TouchableOpacity
          onPress={() => handleDeleteReview(item)}
          className="flex-1 bg-red-50 py-2 rounded-xl items-center justify-center border border-red-200"
          activeOpacity={0.7}
        >
          <Text className="text-red-600 text-xs font-bold">DELETE</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderSkeletons = () =>
    Array.from({ length: 3 }).map((_, i) => (
      <View key={i} className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
        <View className="flex-row items-start mb-3">
          <SkeletonLoader width={64} height={64} borderRadius={12} />
          <View className="flex-1 ml-3">
            <SkeletonLoader height={14} width="70%" className="mb-2" />
            <SkeletonLoader height={11} width="50%" className="mb-2" />
            <SkeletonLoader height={12} width="30%" />
          </View>
          <SkeletonLoader width={60} height={22} borderRadius={11} />
        </View>
        <SkeletonLoader height={34} borderRadius={10} />
      </View>
    ));

  return (
    <View className="flex-1 bg-surface-elevated">
      <AdminHeader
        title="Content Moderation"
        subtitle={`${activeMeals} active meals · ${flaggedCount} flagged reviews`}
      />

      {/* Tabs */}
      <View className="flex-row border-b border-gray-100 bg-white">
        {tabConfig.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            className={`flex-1 py-3.5 items-center border-b-2 relative ${
              activeTab === tab.id ? 'border-primary' : 'border-transparent'
            }`}
          >
            <Text className={`font-bold text-xs ${activeTab === tab.id ? 'text-primary' : 'text-textSecondary'}`}>
              {tab.id === 'meals' ? `Meals (${meals.length})` : tab.id === 'flagged' ? `Flagged (${flaggedCount})` : `All Reviews`}
            </Text>
            {tab.id === 'flagged' && flaggedCount > 0 && (
              <View className="absolute top-2 right-2 w-4 h-4 rounded-full bg-red-500 items-center justify-center">
                <Text className="text-white text-[8px] font-black">{flaggedCount > 9 ? '9+' : flaggedCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter Bar */}
      <View className="bg-white border-b border-gray-50 px-4 py-2">
        {activeTab === 'meals' ? (
          <>
            <SearchBar
              value={mealSearch}
              onChangeText={setMealSearch}
              placeholder="Search meals by name, category..."
              className="mb-2"
            />
            <View className="flex-row gap-2">
              {(['all', 'active', 'inactive'] as MealStatusFilter[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setMealStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-full border ${
                    mealStatusFilter === f ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-200'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text className={`text-[11px] font-bold capitalize ${mealStatusFilter === f ? 'text-white' : 'text-textSecondary'}`}>
                    {f === 'all' ? 'All' : f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <SearchBar
              value={reviewSearch}
              onChangeText={setReviewSearch}
              placeholder="Search reviews by customer, meal..."
              className="mb-2"
            />
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className="text-textMuted text-[10px] font-bold">Rating:</Text>
              {(['all', '1', '2', '3', '4', '5'] as RatingFilter[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRatingFilter(r)}
                  className={`px-2.5 py-1 rounded-full border ${
                    ratingFilter === r ? 'bg-amber-500 border-amber-500' : 'bg-gray-50 border-gray-200'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text className={`text-[11px] font-bold ${ratingFilter === r ? 'text-white' : 'text-textSecondary'}`}>
                    {r === 'all' ? 'All' : `${r}★`}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setSortNewest(!sortNewest)}
                className="ml-auto flex-row items-center bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200"
                activeOpacity={0.7}
              >
                <Feather name={sortNewest ? 'arrow-down' : 'arrow-up'} size={11} color="#6B7280" />
                <Text className="text-textSecondary text-[11px] font-bold ml-1">
                  {sortNewest ? 'Newest' : 'Oldest'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <ScrollView className="flex-1 px-4 pt-3" showsVerticalScrollIndicator={false}>
          {renderSkeletons()}
        </ScrollView>
      ) : activeTab === 'meals' ? (
        <FlatList
          data={filteredMeals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF6B35']} tintColor="#FF6B35" />
          }
          ListEmptyComponent={
            <View className="py-16 items-center">
              <View className="w-16 h-16 rounded-full bg-gray-50 items-center justify-center mb-4">
                <Feather name="coffee" size={28} color="#9CA3AF" />
              </View>
              <Text className="text-textPrimary font-bold text-base">No Meals Found</Text>
              <Text className="text-textMuted text-xs text-center mt-2">
                {mealSearch || mealStatusFilter !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'No meal listings exist on the platform yet.'}
              </Text>
            </View>
          }
          renderItem={renderMealCard}
        />
      ) : (
        <FlatList
          data={filteredReviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF6B35']} tintColor="#FF6B35" />
          }
          ListEmptyComponent={
            <View className="py-16 items-center">
              <View className="w-16 h-16 rounded-full bg-gray-50 items-center justify-center mb-4">
                <Feather
                  name={activeTab === 'flagged' ? 'check-circle' : 'message-square'}
                  size={28}
                  color={activeTab === 'flagged' ? '#10B981' : '#9CA3AF'}
                />
              </View>
              <Text className="text-textPrimary font-bold text-base">
                {activeTab === 'flagged' ? 'No Flagged Reviews' : 'No Reviews Yet'}
              </Text>
              <Text className="text-textMuted text-xs text-center mt-2">
                {activeTab === 'flagged'
                  ? 'All reviews are currently clear of flags.'
                  : reviewSearch || ratingFilter !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'No customer reviews have been submitted yet.'}
              </Text>
            </View>
          }
          renderItem={renderReviewCard}
        />
      )}

      {/* Meal Detail Modal */}
      <Modal visible={!!selectedMeal} animationType="slide" transparent onRequestClose={() => setSelectedMeal(null)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl" style={{ maxHeight: '85%' }}>
            <View className="flex-row justify-between items-center p-5 border-b border-gray-100">
              <Text className="text-textPrimary font-black text-lg flex-1 mr-3" numberOfLines={1}>
                {selectedMeal?.name}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedMeal(null)}
                className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
              >
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
            >
              {selectedMeal?.photos?.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-1">
                  {selectedMeal.photos.map((url: string, i: number) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setSelectedImageUrl(url)}
                      className="w-40 h-32 rounded-2xl overflow-hidden border border-gray-200 mx-1"
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: url }} className="w-full h-full" resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <View className="flex-row flex-wrap gap-2 mb-4">
                <Badge
                  label={selectedMeal?.active !== false ? 'Active' : 'Suspended'}
                  variant={selectedMeal?.active !== false ? 'success' : 'error'}
                />
                {selectedMeal?.category && <Badge label={selectedMeal.category} variant="neutral" />}
                {selectedMeal?.combo && <Badge label="Combo Deal" variant="primary" />}
              </View>

              {[
                { label: 'Price', value: `LKR ${selectedMeal?.price?.toFixed(2)}` },
                { label: 'Cuisine', value: selectedMeal?.cuisineType || 'N/A' },
                { label: 'Cook ID', value: selectedMeal?.cookId || 'N/A', mono: true },
                { label: 'Avg Rating', value: selectedMeal?.avgRating > 0 ? `⭐ ${selectedMeal.avgRating?.toFixed(1)}` : 'No ratings' },
                { label: 'Total Orders', value: String(selectedMeal?.totalOrders || 0) },
                { label: 'Portions Left', value: selectedMeal?.portionLimit > 0 ? String(selectedMeal.portionsRemaining) : 'Unlimited' },
              ].map(({ label, value, mono }) => (
                <View key={label} className="flex-row justify-between py-2 border-b border-gray-50">
                  <Text className="text-textSecondary text-xs font-semibold">{label}</Text>
                  <Text className={`text-textPrimary text-xs font-bold ${mono ? 'font-mono' : ''}`}>{value}</Text>
                </View>
              ))}

              {selectedMeal?.description && (
                <View className="bg-gray-50 p-3 rounded-xl mt-4 border border-gray-100">
                  <Text className="text-textSecondary text-[10px] font-bold uppercase mb-1">Description</Text>
                  <Text className="text-textPrimary text-xs leading-relaxed">{selectedMeal.description}</Text>
                </View>
              )}

              {selectedMeal?.allergenTags?.length > 0 && (
                <View className="mt-4">
                  <Text className="text-textSecondary text-[10px] font-bold uppercase mb-2">Allergens</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {selectedMeal.allergenTags.map((tag: string) => (
                      <View key={tag} className="bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                        <Text className="text-red-700 text-[10px] font-bold capitalize">{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View className="mt-5 gap-2">
                <Button
                  title={selectedMeal?.active !== false ? 'SUSPEND LISTING' : 'ACTIVATE LISTING'}
                  onPress={() => handleToggleMeal(selectedMeal)}
                  variant={selectedMeal?.active !== false ? 'outline' : 'primary'}
                  size="md"
                />
                <Button title="CLOSE" onPress={() => setSelectedMeal(null)} variant="outline" size="md" />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Review Detail Modal */}
      <Modal visible={!!selectedReview} animationType="slide" transparent onRequestClose={() => setSelectedReview(null)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl" style={{ maxHeight: '80%' }}>
            <View className="flex-row justify-between items-center p-5 border-b border-gray-100">
              <Text className="text-textPrimary font-black text-lg">Review Detail</Text>
              <TouchableOpacity
                onPress={() => setSelectedReview(null)}
                className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
              >
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-textPrimary font-extrabold text-base">
                    {selectedReview?.customerName}
                  </Text>
                  {selectedReview?.mealName && (
                    <Text className="text-textSecondary text-xs mt-0.5">{selectedReview.mealName}</Text>
                  )}
                  <Text className="text-amber-500 text-lg font-bold mt-1">
                    {renderStars(selectedReview?.rating || 0)}
                  </Text>
                </View>
                <Badge
                  label={selectedReview?.flagged ? 'Flagged' : 'Active'}
                  variant={selectedReview?.flagged ? 'error' : 'success'}
                />
              </View>

              {selectedReview?.comment && (
                <View className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
                  <Text className="text-textPrimary text-sm leading-relaxed italic">
                    &ldquo;{selectedReview.comment}&rdquo;
                  </Text>
                </View>
              )}

              {selectedReview?.photoUrl && (
                <TouchableOpacity
                  onPress={() => setSelectedImageUrl(selectedReview.photoUrl)}
                  className="h-48 rounded-2xl overflow-hidden border border-gray-200 mb-4"
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: selectedReview.photoUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}

              {selectedReview?.flagged && selectedReview?.flaggedReason && (
                <View className="bg-red-50 p-3 rounded-xl border border-red-200 mb-4">
                  <Text className="text-red-700 font-bold text-xs mb-1">Flag Reason:</Text>
                  <Text className="text-red-900 text-xs leading-relaxed">
                    {selectedReview.flaggedReason}
                  </Text>
                </View>
              )}

              <Text className="text-textMuted text-[10px] mb-4">
                Submitted:{' '}
                {selectedReview?.createdAt
                  ? new Date(selectedReview.createdAt).toLocaleString('en-GB')
                  : 'Unknown'}
              </Text>

              <View className="gap-2">
                {selectedReview?.flagged && (
                  <Button
                    title="DISMISS FLAG"
                    onPress={() => handleDismissFlag(selectedReview.id)}
                    variant="outline"
                    size="md"
                  />
                )}
                <TouchableOpacity
                  onPress={() => handleDeleteReview(selectedReview)}
                  className="bg-red-50 py-3 rounded-xl items-center justify-center border border-red-200"
                  activeOpacity={0.7}
                >
                  <Text className="text-red-600 font-bold text-sm">⚠️ DELETE PERMANENTLY</Text>
                </TouchableOpacity>
                <Button title="CLOSE" onPress={() => setSelectedReview(null)} variant="outline" size="md" />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Image Viewer */}
      <Modal visible={!!selectedImageUrl} animationType="fade" transparent onRequestClose={() => setSelectedImageUrl(null)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSelectedImageUrl(null)}
          className="flex-1 bg-black/92 justify-center items-center p-6"
        >
          <TouchableOpacity
            onPress={() => setSelectedImageUrl(null)}
            className="absolute top-12 right-6 w-11 h-11 rounded-full bg-white/20 items-center justify-center z-50"
          >
            <Feather name="x" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImageUrl && (
            <Image
              source={{ uri: selectedImageUrl }}
              style={{ width: '100%', height: 320 }}
              resizeMode="contain"
              className="rounded-2xl"
            />
          )}
          <Text className="text-white/60 text-xs mt-5 tracking-wide uppercase font-bold">
            Tap anywhere to close
          </Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
