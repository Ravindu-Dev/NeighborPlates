import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Feather } from '@expo/vector-icons';

export const ContentModerationScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'meals' | 'reviews'>('meals');
  const [meals, setMeals] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMeals = async () => {
    try {
      const response = await api.get('/api/admin/meals');
      setMeals(response.data);
    } catch (error) {
      console.error('Error fetching meals:', error);
      Alert.alert('Error', 'Failed to fetch meal listings.');
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await api.get('/api/admin/reviews?flagged=true');
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      Alert.alert('Error', 'Failed to fetch flagged reviews.');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'meals') {
      await fetchMeals();
    } else {
      await fetchReviews();
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'meals') {
      await fetchMeals();
    } else {
      await fetchReviews();
    }
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleToggleMeal = async (mealId: string, currentActive: boolean) => {
    try {
      await api.put(`/api/admin/meals/${mealId}/toggle-active`);
      Alert.alert('Success', `Meal listing ${currentActive ? 'suspended' : 'activated'} successfully.`);
      fetchMeals();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to toggle meal status.');
    }
  };

  const handleDismissFlag = async (reviewId: string) => {
    try {
      await api.put(`/api/admin/reviews/${reviewId}/dismiss-flag`);
      Alert.alert('Success', 'Flag dismissed successfully.');
      fetchReviews();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to dismiss flag.');
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this review permanently? This will update the meal and cook ratings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/reviews/${reviewId}`);
              Alert.alert('Success', 'Review deleted successfully.');
              fetchReviews();
            } catch (error: any) {
              console.error(error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete review.');
            }
          },
        },
      ]
    );
  };

  const renderStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* Tabs Selection */}
      <View className="flex-row border-b border-gray-100 bg-white">
        <TouchableOpacity
          onPress={() => setActiveTab('meals')}
          className={`flex-1 py-4 items-center border-b-2 ${activeTab === 'meals' ? 'border-primary' : 'border-transparent'}`}
        >
          <Text className={`font-bold text-sm ${activeTab === 'meals' ? 'text-primary' : 'text-textSecondary'}`}>
            Meal Listings ({meals.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('reviews')}
          className={`flex-1 py-4 items-center border-b-2 ${activeTab === 'reviews' ? 'border-primary' : 'border-transparent'}`}
        >
          <Text className={`font-bold text-sm ${activeTab === 'reviews' ? 'text-primary' : 'text-textSecondary'}`}>
            Flagged Reviews ({reviews.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1A1A2E" />
        </View>
      ) : activeTab === 'meals' ? (
        <FlatList
          data={meals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF6B35']} />
          }
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
              <Feather name="coffee" size={48} color="#9CA3AF" />
              <Text className="text-textSecondary text-sm font-semibold mt-4">No meal listings found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card className="mb-4">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-textPrimary font-extrabold text-sm">{item.name}</Text>
                  <Text className="text-textSecondary text-xs mt-0.5">{item.category}</Text>
                  <Text className="text-secondary font-bold text-xs mt-1">LKR {item.price}</Text>
                </View>
                <Badge
                  label={item.active ? "Active" : "Suspended"}
                  variant={item.active ? "success" : "error"}
                />
              </View>

              {item.description ? (
                <Text className="text-textMuted text-xs mt-2" numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}

              <Button
                title={item.active ? "SUSPEND LISTING" : "ACTIVATE LISTING"}
                onPress={() => handleToggleMeal(item.id, item.active)}
                variant={item.active ? "outline" : "primary"}
                size="sm"
                className="mt-4"
              />
            </Card>
          )}
        />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF6B35']} />
          }
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
              <Feather name="check-circle" size={48} color="#10B981" />
              <Text className="text-textSecondary text-sm font-semibold mt-4">No flagged reviews</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card className="mb-4 border-l-4 border-l-red-500">
              <View className="flex-row justify-between items-start mb-2">
                <View>
                  <Text className="text-textPrimary font-extrabold text-sm">{item.customerName}</Text>
                  <Text className="text-amber-500 text-xs mt-0.5 font-bold">{renderStars(item.rating)}</Text>
                </View>
                <Badge label="Reported" variant="error" />
              </View>

              <Text className="text-textSecondary text-xs mt-1">
                "{item.comment}"
              </Text>

              <View className="bg-red-50 p-2.5 rounded-xl border border-red-100 mt-3">
                <View className="flex-row items-center">
                  <Feather name="alert-triangle" size={12} color="#EF4444" />
                  <Text className="text-red-700 font-extrabold text-[10px] uppercase ml-1.5 tracking-wider">Report Reason</Text>
                </View>
                <Text className="text-red-600 text-xs mt-1 font-medium">{item.flaggedReason || 'Unspecified reason'}</Text>
              </View>

              <View className="flex-row justify-between mt-4">
                <Button
                  title="DISMISS FLAG"
                  onPress={() => handleDismissFlag(item.id)}
                  variant="outline"
                  size="sm"
                  className="flex-1 mr-2"
                />
                <Button
                  title="DELETE REVIEW"
                  onPress={() => handleDeleteReview(item.id)}
                  variant="primary"
                  size="sm"
                  className="flex-1 ml-2 bg-red-600 border-red-600"
                />
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
};
