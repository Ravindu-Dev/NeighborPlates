import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, RefreshControl, ScrollView, TextInput } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { ChefCard } from '../../components/customer/ChefCard';
import { MealCard } from '../../components/customer/MealCard';
import { Ionicons, Feather } from '@expo/vector-icons';

type HomeScreenNavigationProp = NativeStackNavigationProp<CustomerStackParamList, 'HomeTabs'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'none'>('none');

  const promos = [
    { id: '1', title: '50% OFF First Order', desc: 'Use code: NEIGHBOR50', color: 'from-orange-500 to-amber-500', badge: 'SPECIAL' },
    { id: '2', title: 'Free Cook Delivery', desc: 'On orders above LKR 1000', color: 'from-emerald-600 to-teal-500', badge: 'FREE SHIPPING' },
    { id: '3', title: 'LKR 150 Flat Discount', desc: 'Support local home chefs today', color: 'from-blue-600 to-indigo-500', badge: 'SUPPORT LOCAL' }
  ];

  const categoriesList = [
    { key: 'ALL', label: 'All', emoji: '🍽️' },
    { key: 'BREAKFAST', label: 'Breakfast', emoji: '🥞' },
    { key: 'LUNCH', label: 'Lunch', emoji: '🍛' },
    { key: 'DINNER', label: 'Dinner', emoji: '🍜' },
    { key: 'SNACKS', label: 'Snacks', emoji: '🍩' },
  ];

  const fetchMeals = async (category: string) => {
    try {
      const categoryParam = category && category !== 'ALL' ? `?category=${category}` : '';
      const response = await api.get(`/api/meals${categoryParam}`);
      setMeals(response.data);
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMeals(selectedCategory);
    setRefreshing(false);
  }, [selectedCategory]);

  useEffect(() => {
    fetchMeals(selectedCategory);

    const unsubscribe = navigation.addListener('focus', () => {
      fetchMeals(selectedCategory);
    });
    return unsubscribe;
  }, [navigation, selectedCategory]);

  // Extract unique chefs dynamically from the active list of meals
  const getUniqueCooks = (mealsList: any[]) => {
    const cooksMap = new Map();
    mealsList.forEach(meal => {
      if (meal.cookId && !cooksMap.has(meal.cookId)) {
        cooksMap.set(meal.cookId, {
          id: meal.cookId,
          name: meal.cookName,
          rating: meal.avgRating || 4.8,
          specialty: meal.category === 'LUNCH' ? 'Traditional Sri Lankan' : 'Home-style Delicacies',
        });
      }
    });
    return Array.from(cooksMap.values());
  };

  const uniqueCooks = getUniqueCooks(meals);

  // Search & Sorting Filter Logics
  const getProcessedMeals = () => {
    let processed = meals.filter(meal => 
      (meal.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (meal.cookName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (meal.category || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortBy === 'rating') {
      processed.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
    } else if (sortBy === 'price') {
      processed.sort((a, b) => a.price - b.price);
    }

    return processed;
  };

  const processedMeals = getProcessedMeals();
  const popularMeals = meals.filter(m => (m.avgRating || 0) >= 4.5).slice(0, 5);

  return (
    <View className="flex-1 bg-surface-elevated relative">
      {/* Liquid Background Blobs */}
      <View className="absolute w-72 h-72 rounded-full bg-primary/5 -top-20 -left-20 blur-3xl opacity-40" />
      <View className="absolute w-80 h-80 rounded-full bg-secondary/5 top-80 -right-20 blur-3xl opacity-30" />

      {/* Modern Sticky Header */}
      <View className="bg-white border-b border-gray-100 px-6 pt-12 pb-4 shadow-sm z-10">
        <View className="flex-row justify-between items-center mb-3">
          <View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="location-sharp" size={14} color="#FF6B35" />
              <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider">Deliver to</Text>
            </View>
            <Text className="text-textPrimary font-extrabold text-sm mt-0.5">Colombo, Sri Lanka ▾</Text>
          </View>
          <View className="border border-primary/20 bg-primary/10 rounded-full px-3.5 py-1.5 flex-row items-center gap-1">
            <Ionicons name="sparkles" size={10} color="#FF6B35" />
            <Text className="text-primary font-black text-[9px] uppercase tracking-wider">Fresh & Local</Text>
          </View>
        </View>

        {/* Premium search bar */}
        <View className="flex-row items-center gap-3">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-2xl px-4 py-2.5 border border-gray-200 shadow-inner">
            <Feather name="search" size={16} color="#6B7280" className="mr-2" />
            <TextInput
              placeholder="Search dishes, home chefs, kitchens..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-xs text-textPrimary p-0"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            onPress={() => setSortBy(prev => prev === 'rating' ? 'price' : prev === 'price' ? 'none' : 'rating')}
            className={`p-3 rounded-2xl border ${sortBy !== 'none' ? 'bg-primary border-primary' : 'bg-gray-100 border-gray-200'}`}
          >
            <Feather name="sliders" size={16} color={sortBy !== 'none' ? '#FFFFFF' : '#6B7280'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" colors={['#FF6B35']} />
        }
      >
        <View className="px-6 pt-6">
          {/* Welcome Info */}
          <View className="mb-6">
            <Text className="text-textSecondary text-xs font-semibold">Welcome back, neighbor! 👋</Text>
            <Text className="text-textPrimary text-2xl font-black tracking-tight mt-0.5">Discover Home Kitchens</Text>
          </View>

          {/* Marketing Banners Horizontal Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-8"
            snapToInterval={280}
            decelerationRate="fast"
          >
            {promos.map((item) => (
              <View 
                key={item.id}
                className="w-72 bg-[#1A1A2E] rounded-3xl p-5 mr-4 border border-gray-800 shadow-md relative overflow-hidden h-36"
              >
                <View className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
                <View className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-white/5" />
                <View className="bg-white/10 px-2 py-0.5 rounded-md self-start mb-2 border border-white/20">
                  <Text className="text-white text-[8px] font-black tracking-widest uppercase">{item.badge}</Text>
                </View>
                <Text className="text-white font-extrabold text-lg leading-6 mb-1">{item.title}</Text>
                <Text className="text-white/60 text-xs font-semibold">{item.desc}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Visual Categories Grid */}
          <View className="mb-8">
            <Text className="text-textPrimary font-black text-sm uppercase tracking-wider mb-4">Explore Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
              {categoriesList.map((item) => {
                const isActive = selectedCategory === item.key || (item.key === 'ALL' && selectedCategory === '');
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => setSelectedCategory(item.key === 'ALL' ? '' : item.key)}
                    className={`mr-3 items-center justify-center rounded-3xl p-3 border shadow-sm w-20 h-20 ${
                      isActive
                        ? 'bg-primary border-primary'
                        : 'bg-white border-gray-100'
                    }`}
                    activeOpacity={0.8}
                  >
                    <Text className="text-2xl mb-1">{item.emoji}</Text>
                    <Text className={`text-[10px] font-black uppercase text-center ${isActive ? 'text-white' : 'text-textSecondary'}`}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Horizontal Featured Chefs Section */}
          {uniqueCooks.length > 0 && (
            <View className="mb-8">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-textPrimary font-black text-sm uppercase tracking-wider">Featured Home Chefs</Text>
                <Text className="text-primary font-bold text-xs uppercase tracking-wide">See All</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
                {uniqueCooks.map((chef: any) => (
                  <ChefCard
                    key={chef.id}
                    cookId={chef.id}
                    name={chef.name}
                    rating={chef.rating}
                    specialty={chef.specialty}
                    onPress={() => setSelectedCategory('')} // Clear to show their meals
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Horizontal Popular Near You Carousel */}
          {popularMeals.length > 0 && (
            <View className="mb-8">
              <Text className="text-textPrimary font-black text-sm uppercase tracking-wider mb-4">⭐ Highly Rated Neighbors</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
                {popularMeals.map((meal) => (
                  <TouchableOpacity
                    key={meal.id}
                    onPress={() => navigation.navigate('MealDetail', { mealId: meal.id })}
                    className="bg-white rounded-3xl border border-gray-150 p-3 mr-4 w-48 shadow-sm"
                    activeOpacity={0.8}
                  >
                    <View className="h-28 rounded-2xl bg-primary/10 overflow-hidden mb-3.5 relative">
                      {meal.photos && meal.photos.length > 0 ? (
                        <Image source={{ uri: meal.photos[0] }} className="w-full h-full object-cover" />
                      ) : (
                        <View className="w-full h-full items-center justify-center">
                          <Text className="text-3xl">🍲</Text>
                        </View>
                      )}
                      <View className="absolute top-2 left-2 bg-amber-50 border border-amber-150 px-2 py-0.5 rounded-md shadow-xs flex-row items-center">
                        <Text className="text-[8px] mr-0.5">⭐</Text>
                        <Text className="text-amber-800 font-extrabold text-[8px]">{meal.avgRating.toFixed(1)}</Text>
                      </View>
                    </View>
                    <Text className="text-textPrimary font-extrabold text-xs mb-0.5" numberOfLines={1}>{meal.name}</Text>
                    <Text className="text-textSecondary text-[9px] mb-2" numberOfLines={1}>By {meal.cookName}</Text>
                    <Text className="text-primary font-black text-xs">LKR {meal.price}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Vertical Main Feed Section */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-textPrimary font-black text-sm uppercase tracking-wider">All Active Kitchens</Text>
              {sortBy !== 'none' && (
                <View className="bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                  <Text className="text-primary font-bold text-[9px] uppercase tracking-wide">Sorted by {sortBy}</Text>
                </View>
              )}
            </View>

            {loading ? (
              <View className="py-12 justify-center items-center">
                <ActivityIndicator size="large" color="#FF6B35" />
              </View>
            ) : processedMeals.length === 0 ? (
              <View className="py-12 justify-center items-center">
                <Text className="text-4xl mb-3">🍲</Text>
                <Text className="text-textPrimary font-bold text-sm mb-1 text-center">No matching meals found</Text>
                <Text className="text-textSecondary text-xs text-center">Try editing your search query or sorting options.</Text>
              </View>
            ) : (
              processedMeals.map((meal) => (
                <MealCard
                  key={meal.id}
                  id={meal.id}
                  name={meal.name}
                  price={meal.price}
                  category={meal.category}
                  cookName={meal.cookName}
                  avgRating={meal.avgRating}
                  portionsRemaining={meal.portionsRemaining}
                  photos={meal.photos}
                  onPress={() => navigation.navigate('MealDetail', { mealId: meal.id })}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
