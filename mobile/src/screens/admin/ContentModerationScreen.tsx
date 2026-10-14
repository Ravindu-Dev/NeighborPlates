import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, Alert,
  TouchableOpacity, RefreshControl, Image, Modal, ScrollView, TextInput
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
  const safeRating = Math.max(0, Math.min(5, Math.floor(Number(rating) || 0)));
  return '★'.repeat(safeRating) + '☆'.repeat(5 - safeRating);
};

export const ContentModerationScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ContentTab>('meals');
  const [meals, setMeals] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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

  // Meal Notice Modal State
  const [mealNoticeModalVisible, setMealNoticeModalVisible] = useState(false);
  const [mealNoticeTarget, setMealNoticeTarget] = useState<any | null>(null);
  const [mealNoticeText, setMealNoticeText] = useState('');
  const [mealNoticeLoading, setMealNoticeLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [mealsRes, reviewsRes] = await Promise.all([
        api.get('/api/admin/meals'),
        api.get('/api/admin/reviews')
      ]);
      setMeals(Array.isArray(mealsRes.data) ? mealsRes.data : []);
      setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : []);
    } catch (error: any) {
      console.error('Failed to fetch content moderation data:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load content moderation data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleToggleMeal = (meal: any) => {
    const willActivate = meal.active === false;
    Alert.alert(
      willActivate ? 'Activate Meal Listing' : 'Suspend Meal Listing',
      willActivate
        ? `"${meal.name}" will be made visible and available for customers to order.`
        : `"${meal.name}" will be hidden from the platform and customers will not be able to order it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: willActivate ? 'Activate' : 'Suspend',
          style: willActivate ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setActionLoadingId(meal.id);
              const response = await api.put(`/api/admin/meals/${meal.id}/toggle-active`);
              const updatedMeal = response.data;
              setMeals((prev) =>
                prev.map((m) => (m.id === meal.id ? { ...m, ...updatedMeal } : m))
              );
              if (selectedMeal?.id === meal.id) {
                setSelectedMeal((prev: any) => ({ ...prev, ...updatedMeal }));
              }
              Alert.alert(
                'Success',
                `"${meal.name}" has been ${updatedMeal.active ? 'activated' : 'suspended'} successfully.`
              );
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to update meal status.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handleOpenMealNotice = (meal: any) => {
    setMealNoticeTarget(meal);
    setMealNoticeText(meal.adminNotice || '');
    setMealNoticeModalVisible(true);
  };

  const handleIssueMealNotice = async () => {
    if (!mealNoticeTarget || !mealNoticeText.trim()) {
      Alert.alert('Notice Required', 'Please enter an advisory notice for this meal listing.');
      return;
    }
    setMealNoticeLoading(true);
    try {
      const response = await api.put(`/api/admin/meals/${mealNoticeTarget.id}/notice`, {
        notice: mealNoticeText.trim(),
      });
      const updated = response.data;
      setMeals((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      if (selectedMeal?.id === updated.id) {
        setSelectedMeal(updated);
      }
      setMealNoticeModalVisible(false);
      Alert.alert('Notice Recorded ⚠️', `Advisory notice recorded for "${updated.name}". The cook will see this notice.`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to issue meal notice.');
    } finally {
      setMealNoticeLoading(false);
    }
  };

  const handleClearMealNotice = async (mealId: string) => {
    setActionLoadingId(mealId);
    try {
      const response = await api.delete(`/api/admin/meals/${mealId}/notice`);
      const updated = response.data;
      setMeals((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      if (selectedMeal?.id === updated.id) {
        setSelectedMeal(updated);
      }
      Alert.alert('Notice Cleared', 'Advisory notice was removed from this meal.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to clear notice.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleFlagReview = (review: any) => {
    Alert.alert(
      'Flag Review for Moderation',
      `Flag this review by "${review.customerName || 'Customer'}" for community guidelines review?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Flag Review',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoadingId(review.id);
              await api.put(`/api/admin/reviews/${review.id}/flag?reason=Flagged+by+Administrator`);
              setReviews((prev) =>
                prev.map((r) =>
                  r.id === review.id ? { ...r, flagged: true, flaggedReason: 'Flagged by Administrator' } : r
                )
              );
              if (selectedReview?.id === review.id) {
                setSelectedReview((prev: any) => ({ ...prev, flagged: true, flaggedReason: 'Flagged by Administrator' }));
              }
              Alert.alert('Review Flagged', 'The review has been flagged and moved to the Flagged queue.');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to flag review.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handleDismissFlag = (review: any) => {
    Alert.alert(
      'Dismiss Flag',
      'This will clear the flag and mark the review as acceptable. The review will remain visible on the platform.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss Flag',
          onPress: async () => {
            try {
              setActionLoadingId(review.id);
              await api.put(`/api/admin/reviews/${review.id}/dismiss-flag`);
              setReviews((prev) =>
                prev.map((r) =>
                  r.id === review.id ? { ...r, flagged: false, flaggedReason: null } : r
                )
              );
              if (selectedReview?.id === review.id) {
                setSelectedReview((prev: any) => ({ ...prev, flagged: false, flaggedReason: null }));
              }
              Alert.alert('Flag Dismissed', 'The flag was successfully dismissed.');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to dismiss flag.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteReview = (review: any) => {
    Alert.alert(
      '⚠️ Permanently Delete Review',
      `This will permanently delete "${review.customerName || 'Customer'}"'s review and recalculate meal and cook ratings. This action CANNOT be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoadingId(review.id);
              await api.delete(`/api/admin/reviews/${review.id}`);
              setReviews((prev) => prev.filter((r) => r.id !== review.id));
              setSelectedReview(null);
              Alert.alert('Deleted', 'The review was permanently deleted and ratings were recalculated.');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete review.');
            } finally {
              setActionLoadingId(null);
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
          m.category?.toLowerCase().includes(q) ||
          m.cuisineType?.toLowerCase().includes(q)
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
    if (activeTab === 'flagged') {
      list = list.filter((r: any) => r.flagged === true);
    }
    if (reviewSearch.trim()) {
      const q = reviewSearch.toLowerCase();
      list = list.filter(
        (r: any) =>
          r.customerName?.toLowerCase().includes(q) ||
          r.mealName?.toLowerCase().includes(q) ||
          r.comment?.toLowerCase().includes(q) ||
          r.flaggedReason?.toLowerCase().includes(q)
      );
    }
    if (ratingFilter !== 'all') {
      list = list.filter((r: any) => String(r.rating) === ratingFilter);
    }
    if (sortNewest) {
      list = [...list].sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    } else {
      list = [...list].sort(
        (a: any, b: any) =>
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
    }
    return list;
  }, [reviews, activeTab, reviewSearch, ratingFilter, sortNewest]);

  const activeMealsCount = meals.filter((m: any) => m.active !== false).length;
  const flaggedReviewsCount = reviews.filter((r: any) => r.flagged === true).length;

  const tabConfig = [
    { id: 'meals' as ContentTab, label: `Meals (${meals.length})` },
    { id: 'flagged' as ContentTab, label: `Flagged (${flaggedReviewsCount})`, badgeCount: flaggedReviewsCount },
    { id: 'all' as ContentTab, label: `All Reviews (${reviews.length})` },
  ];

  const renderMealCard = ({ item }: { item: any }) => {
    const isSuspended = item.active === false;
    const isActionLoading = actionLoadingId === item.id;

    return (
      <Card className="mb-3 overflow-hidden" bordered>
        <TouchableOpacity onPress={() => setSelectedMeal(item)} activeOpacity={0.8}>
          <View className="flex-row items-start mb-3">
            {/* Meal Image */}
            {item.photos && item.photos.length > 0 ? (
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
                LKR {Number(item.price || 0).toFixed(2)}
              </Text>
              {Number(item.avgRating || 0) > 0 && (
                <Text className="text-amber-500 text-xs font-bold mt-0.5">
                  ⭐ {Number(item.avgRating).toFixed(1)} ({item.totalOrders || 0} orders)
                </Text>
              )}
            </View>

            <Badge
              label={!isSuspended ? 'Active' : 'Suspended'}
              variant={!isSuspended ? 'success' : 'error'}
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
              <Text className="text-primary text-[10px] font-bold ml-1">Tap for full details</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Active Advisory Notice Banner */}
        {!!item.adminNotice && (
          <View className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mt-3 flex-row items-start">
            <Feather name="alert-triangle" size={13} color="#D97706" style={{ marginTop: 2, marginRight: 6 }} />
            <View className="flex-1">
              <Text className="text-amber-900 font-bold text-[11px]">Active Advisory Notice:</Text>
              <Text className="text-amber-800 text-xs mt-0.5 leading-snug">{item.adminNotice}</Text>
            </View>
          </View>
        )}

        <View className="border-t border-gray-100 pt-3 mt-3 flex-row gap-2">
          <Button
            title="NOTICE"
            onPress={() => handleOpenMealNotice(item)}
            variant="outline"
            size="sm"
            className="flex-1"
          />
          <Button
            title={!isSuspended ? 'SUSPEND' : 'ACTIVATE'}
            onPress={() => handleToggleMeal(item)}
            variant={!isSuspended ? 'outline' : 'primary'}
            size="sm"
            className="flex-1"
            loading={isActionLoading}
          />
        </View>
      </Card>
    );
  };

  const renderReviewCard = ({ item }: { item: any }) => {
    const isActionLoading = actionLoadingId === item.id;

    return (
      <Card
        className={`mb-3 border-l-4 overflow-hidden ${
          item.flagged ? 'border-l-red-500 bg-red-50/20' : 'border-l-gray-200'
        }`}
        bordered
      >
        <TouchableOpacity onPress={() => setSelectedReview(item)} activeOpacity={0.8}>
          <View className="flex-row items-start mb-2">
            <View className="flex-1 mr-2">
              <Text className="text-textPrimary font-extrabold text-sm">
                {item.customerName || 'Customer'}
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
              <Badge
                label={item.flagged ? 'Flagged' : 'Active'}
                variant={item.flagged ? 'error' : 'success'}
              />
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
            <Text className="text-textMuted text-xs italic mb-2">No written comment</Text>
          )}

          {item.photoUrl ? (
            <TouchableOpacity
              onPress={() => setSelectedImageUrl(item.photoUrl)}
              className="rounded-xl h-28 overflow-hidden bg-gray-100 border border-gray-200 mb-2"
              activeOpacity={0.85}
            >
              <Image source={{ uri: item.photoUrl }} className="w-full h-full" resizeMode="cover" />
            </TouchableOpacity>
          ) : null}

          {item.flagged && (
            <View className="bg-red-50 px-3 py-2 rounded-xl border border-red-100 mb-2 flex-row items-start">
              <Feather name="alert-triangle" size={13} color="#EF4444" style={{ marginTop: 2 }} />
              <Text className="text-red-700 text-xs ml-2 font-medium flex-1 leading-relaxed">
                <Text className="font-bold">Flagged: </Text>
                {item.flaggedReason || 'Flagged for moderation'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View className="flex-row gap-2 border-t border-gray-100 pt-3 mt-1">
          {item.flagged ? (
            <TouchableOpacity
              onPress={() => handleDismissFlag(item)}
              disabled={isActionLoading}
              className="flex-1 bg-white border border-gray-300 py-2 rounded-xl items-center justify-center flex-row"
              activeOpacity={0.7}
            >
              <Feather name="check-circle" size={13} color="#10B981" />
              <Text className="text-emerald-700 text-xs font-bold ml-1.5">DISMISS FLAG</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => handleFlagReview(item)}
              disabled={isActionLoading}
              className="flex-1 bg-amber-50 border border-amber-200 py-2 rounded-xl items-center justify-center flex-row"
              activeOpacity={0.7}
            >
              <Feather name="flag" size={13} color="#D97706" />
              <Text className="text-amber-700 text-xs font-bold ml-1.5">FLAG REVIEW</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => handleDeleteReview(item)}
            disabled={isActionLoading}
            className="flex-1 bg-red-50 py-2 rounded-xl items-center justify-center border border-red-200 flex-row"
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={13} color="#DC2626" />
            <Text className="text-red-600 text-xs font-bold ml-1.5">DELETE</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderSkeletons = () =>
    Array.from({ length: 4 }).map((_, i) => (
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
        subtitle={`${activeMealsCount} active meals · ${flaggedReviewsCount} flagged reviews`}
        badge={
          flaggedReviewsCount > 0
            ? { text: `${flaggedReviewsCount} Flagged`, color: 'red' }
            : { text: 'Clear', color: 'green' }
        }
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
            <Text
              className={`font-bold text-xs ${
                activeTab === tab.id ? 'text-primary' : 'text-textSecondary'
              }`}
            >
              {tab.label}
            </Text>
            {tab.badgeCount && tab.badgeCount > 0 ? (
              <View className="absolute top-2 right-2 w-4 h-4 rounded-full bg-red-500 items-center justify-center">
                <Text className="text-white text-[8px] font-black">
                  {tab.badgeCount > 9 ? '9+' : tab.badgeCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter Bar */}
      <View className="bg-white border-b border-gray-50 px-4 py-2.5">
        {activeTab === 'meals' ? (
          <>
            <SearchBar
              value={mealSearch}
              onChangeText={setMealSearch}
              placeholder="Search meals by name, category, cuisine..."
              className="mb-2"
            />
            <View className="flex-row gap-2">
              {(['all', 'active', 'inactive'] as MealStatusFilter[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setMealStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-full border ${
                    mealStatusFilter === f
                      ? 'bg-primary border-primary'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-[11px] font-bold capitalize ${
                      mealStatusFilter === f ? 'text-white' : 'text-textSecondary'
                    }`}
                  >
                    {f === 'all' ? 'All Meals' : f === 'active' ? 'Active' : 'Suspended'}
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
              placeholder={
                activeTab === 'flagged'
                  ? 'Search flagged reviews by customer, comment, reason...'
                  : 'Search all reviews by customer, meal, comment...'
              }
              className="mb-2"
            />
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text className="text-textMuted text-[10px] font-bold mr-1">Rating:</Text>
              {(['all', '5', '4', '3', '2', '1'] as RatingFilter[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRatingFilter(r)}
                  className={`px-2.5 py-1 rounded-full border ${
                    ratingFilter === r
                      ? 'bg-amber-500 border-amber-500'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-[11px] font-bold ${
                      ratingFilter === r ? 'text-white' : 'text-textSecondary'
                    }`}
                  >
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

      {/* Content List */}
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#FF6B35']}
              tintColor="#FF6B35"
            />
          }
          ListEmptyComponent={
            <View className="py-16 items-center">
              <View className="w-16 h-16 rounded-full bg-gray-50 items-center justify-center mb-4">
                <Feather name="coffee" size={28} color="#9CA3AF" />
              </View>
              <Text className="text-textPrimary font-bold text-base">No Meals Found</Text>
              <Text className="text-textMuted text-xs text-center mt-2 px-6">
                {mealSearch || mealStatusFilter !== 'all'
                  ? 'Try adjusting your search query or status filter.'
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#FF6B35']}
              tintColor="#FF6B35"
            />
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
                {activeTab === 'flagged' ? 'No Flagged Reviews' : 'No Reviews Found'}
              </Text>
              <Text className="text-textMuted text-xs text-center mt-2 px-6">
                {activeTab === 'flagged'
                  ? 'All reviews on the platform are currently clean and clear of flags.'
                  : reviewSearch || ratingFilter !== 'all'
                  ? 'No reviews match your current search and rating filter.'
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
              {selectedMeal?.photos && selectedMeal.photos.length > 0 && (
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
                { label: 'Price', value: `LKR ${Number(selectedMeal?.price || 0).toFixed(2)}` },
                { label: 'Cuisine', value: selectedMeal?.cuisineType || 'N/A' },
                { label: 'Cook ID', value: selectedMeal?.cookId || 'N/A', mono: true },
                {
                  label: 'Avg Rating',
                  value:
                    Number(selectedMeal?.avgRating || 0) > 0
                      ? `⭐ ${Number(selectedMeal.avgRating).toFixed(1)}`
                      : 'No ratings yet',
                },
                { label: 'Total Orders', value: String(selectedMeal?.totalOrders || 0) },
                {
                  label: 'Portions Remaining',
                  value:
                    selectedMeal?.portionLimit > 0
                      ? String(selectedMeal.portionsRemaining)
                      : 'Unlimited',
                },
              ].map(({ label, value, mono }) => (
                <View key={label} className="flex-row justify-between py-2 border-b border-gray-50">
                  <Text className="text-textSecondary text-xs font-semibold">{label}</Text>
                  <Text className={`text-textPrimary text-xs font-bold ${mono ? 'font-mono' : ''}`}>
                    {value}
                  </Text>
                </View>
              ))}

              {selectedMeal?.description && (
                <View className="bg-gray-50 p-3 rounded-xl mt-4 border border-gray-100">
                  <Text className="text-textSecondary text-[10px] font-bold uppercase mb-1">
                    Description
                  </Text>
                  <Text className="text-textPrimary text-xs leading-relaxed">
                    {selectedMeal.description}
                  </Text>
                </View>
              )}

              {selectedMeal?.allergenTags && selectedMeal.allergenTags.length > 0 && (
                <View className="mt-4">
                  <Text className="text-textSecondary text-[10px] font-bold uppercase mb-2">
                    Allergens
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {selectedMeal.allergenTags.map((tag: string) => (
                      <View key={tag} className="bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                        <Text className="text-red-700 text-[10px] font-bold capitalize">{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Advisory Notice Section */}
              <View className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 mt-4 mb-2">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Feather name="alert-triangle" size={15} color="#D97706" />
                    <Text className="font-extrabold text-xs text-amber-900 uppercase tracking-wider ml-1.5">
                      Advisory Notice for Cook
                    </Text>
                  </View>
                  {selectedMeal?.adminNotice && (
                    <Badge label="Notice Active" variant="warning" />
                  )}
                </View>

                {selectedMeal?.adminNotice ? (
                  <View className="bg-white p-3 rounded-xl border border-amber-200 mb-3">
                    <Text className="text-xs text-textPrimary font-semibold leading-relaxed">
                      &ldquo;{selectedMeal.adminNotice}&rdquo;
                    </Text>
                    {selectedMeal.noticeIssuedAt && (
                      <Text className="text-[10px] text-textMuted mt-1">
                        Issued: {new Date(selectedMeal.noticeIssuedAt).toLocaleString()}
                      </Text>
                    )}
                    <TouchableOpacity
                      onPress={() => handleClearMealNotice(selectedMeal.id)}
                      className="mt-2.5 bg-gray-100 self-start px-3 py-1.5 rounded-lg border border-gray-200 flex-row items-center"
                    >
                      <Feather name="check-circle" size={12} color="#4B5563" />
                      <Text className="text-[11px] font-bold text-gray-700 ml-1.5">Clear Notice</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text className="text-[11px] text-amber-800 mb-2">
                    No active notice on this meal. You can send an advisory note to the cook without suspending this listing.
                  </Text>
                )}

                <TouchableOpacity
                  onPress={() => {
                    const m = selectedMeal;
                    setSelectedMeal(null);
                    handleOpenMealNotice(m);
                  }}
                  className="bg-amber-600 py-2 rounded-xl items-center justify-center flex-row"
                >
                  <Feather name="edit-3" size={13} color="#FFFFFF" />
                  <Text className="text-white font-bold text-xs ml-1.5">
                    {selectedMeal?.adminNotice ? 'Edit Advisory Notice' : 'Send Advisory Notice'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="mt-4 gap-2">
                <Button
                  title={
                    selectedMeal?.active !== false ? 'SUSPEND LISTING' : 'ACTIVATE LISTING'
                  }
                  onPress={() => handleToggleMeal(selectedMeal)}
                  variant={selectedMeal?.active !== false ? 'outline' : 'primary'}
                  size="md"
                  loading={actionLoadingId === selectedMeal?.id}
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
          <View className="bg-white rounded-t-3xl" style={{ maxHeight: '82%' }}>
            <View className="flex-row justify-between items-center p-5 border-b border-gray-100">
              <Text className="text-textPrimary font-black text-lg">Review Moderation</Text>
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
                <View className="flex-1 mr-3">
                  <Text className="text-textPrimary font-extrabold text-base">
                    {selectedReview?.customerName || 'Customer'}
                  </Text>
                  {selectedReview?.mealName && (
                    <Text className="text-textSecondary text-xs mt-0.5">
                      Meal: &ldquo;{selectedReview.mealName}&rdquo;
                    </Text>
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

              {selectedReview?.comment ? (
                <View className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 mb-4">
                  <Text className="text-textPrimary text-sm leading-relaxed italic">
                    &ldquo;{selectedReview.comment}&rdquo;
                  </Text>
                </View>
              ) : (
                <Text className="text-textMuted text-xs italic mb-4">No written comment provided.</Text>
              )}

              {selectedReview?.photoUrl ? (
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
              ) : null}

              {selectedReview?.flagged && (
                <View className="bg-red-50 p-3.5 rounded-xl border border-red-200 mb-4">
                  <Text className="text-red-700 font-bold text-xs mb-1">Report / Flag Reason:</Text>
                  <Text className="text-red-900 text-xs leading-relaxed">
                    {selectedReview.flaggedReason || 'Unspecified reason'}
                  </Text>
                </View>
              )}

              <Text className="text-textMuted text-[10px] mb-4">
                Submitted:{' '}
                {selectedReview?.createdAt
                  ? new Date(selectedReview.createdAt).toLocaleString('en-GB')
                  : 'Unknown'}
              </Text>

              <View className="gap-2.5">
                {selectedReview?.flagged ? (
                  <TouchableOpacity
                    onPress={() => handleDismissFlag(selectedReview)}
                    className="bg-emerald-50 py-3 rounded-xl items-center justify-center border border-emerald-300 flex-row"
                    activeOpacity={0.7}
                  >
                    <Feather name="check-circle" size={16} color="#059669" />
                    <Text className="text-emerald-700 font-bold text-sm ml-2">DISMISS FLAG</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleFlagReview(selectedReview)}
                    className="bg-amber-50 py-3 rounded-xl items-center justify-center border border-amber-300 flex-row"
                    activeOpacity={0.7}
                  >
                    <Feather name="flag" size={16} color="#D97706" />
                    <Text className="text-amber-800 font-bold text-sm ml-2">FLAG THIS REVIEW</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => handleDeleteReview(selectedReview)}
                  className="bg-red-50 py-3 rounded-xl items-center justify-center border border-red-200 flex-row"
                  activeOpacity={0.7}
                >
                  <Feather name="trash-2" size={16} color="#DC2626" />
                  <Text className="text-red-600 font-bold text-sm ml-2">DELETE PERMANENTLY</Text>
                </TouchableOpacity>

                <Button title="CLOSE" onPress={() => setSelectedReview(null)} variant="outline" size="md" />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Meal Notice Modal */}
      <Modal
        visible={mealNoticeModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setMealNoticeModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center p-5">
          <View className="bg-white rounded-3xl p-5 w-full max-w-md border border-gray-100 shadow-2xl">
            <View className="flex-row items-center justify-between mb-3 border-b border-gray-100 pb-3">
              <View className="flex-row items-center flex-1">
                <View className="w-9 h-9 rounded-full bg-amber-100 items-center justify-center mr-2.5">
                  <Feather name="alert-triangle" size={18} color="#D97706" />
                </View>
                <View className="flex-1">
                  <Text className="font-black text-base text-textPrimary">Meal Advisory Notice</Text>
                  <Text className="text-textMuted text-xs" numberOfLines={1}>
                    {mealNoticeTarget?.name}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setMealNoticeModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Feather name="x" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="bg-amber-50 border border-amber-200 p-3 rounded-2xl mb-3">
              <Text className="text-amber-900 text-xs font-bold">ℹ️ Note to Cook</Text>
              <Text className="text-amber-800 text-[11px] mt-0.5 leading-snug">
                This notice will be visible to the cook on their Meal Management dashboard so they can adjust packaging, ingredients, or photos.
              </Text>
            </View>

            <Text className="text-[11px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">
              Quick Suggestions:
            </Text>
            <View className="flex-row flex-wrap gap-1.5 mb-3">
              {[
                'Please update allergen warning details',
                'Upload a clearer real meal photograph',
                'Ensure portion sizes match description',
                'Review ingredient compliance with standards',
              ].map((preset, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setMealNoticeText(preset)}
                  className="bg-gray-100 px-2.5 py-1.5 rounded-lg border border-gray-200"
                >
                  <Text className="text-gray-700 text-[11px] font-medium">{preset}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-[11px] font-bold text-textSecondary uppercase tracking-wider mb-1">
              Notice Description:
            </Text>
            <TextInput
              value={mealNoticeText}
              onChangeText={setMealNoticeText}
              placeholder="Type specific instructions for the cook..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              style={{ minHeight: 70, textAlignVertical: 'top' }}
              className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs text-textPrimary mb-4"
            />

            <View className="flex-row gap-2">
              <Button
                title="CANCEL"
                onPress={() => setMealNoticeModalVisible(false)}
                variant="outline"
                className="flex-1"
                size="md"
              />
              <Button
                title="SAVE NOTICE"
                onPress={handleIssueMealNotice}
                loading={mealNoticeLoading}
                className="flex-1"
                size="md"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Image Viewer */}
      <Modal visible={!!selectedImageUrl} animationType="fade" transparent onRequestClose={() => setSelectedImageUrl(null)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSelectedImageUrl(null)}
          className="flex-1 bg-black/95 justify-center items-center p-6"
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
              style={{ width: '100%', height: 340 }}
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
