import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, RefreshControl, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { api } from '../../services/api';
import { MealCard } from '../../components/customer/MealCard';
import { FilterModal, FilterState } from '../../components/customer/FilterModal';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';

type HomeScreenNavigationProp = NativeStackNavigationProp<CustomerStackParamList, 'HomeTabs'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const user = useAuthStore((state) => state.user);
  const cartItemCount = useCartStore((state) => state.getItemCount());
  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const [meals, setMeals] = useState<any[]>([]);
  const [aiCombos, setAiCombos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'none'>('none');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    category: 'ALL',
    dietaryPreferences: [],
    district: '',
    town: '',
  });

  const [showCartToast, setShowCartToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef<any>(null);

  const handleAddToCart = (meal: any) => {
    const result = addItem(meal, 1);
    if (result.success) {
      setToastMessage(`Added "${meal.name}" to cart`);
      setShowCartToast(true);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setShowCartToast(false);
      }, 4000);
    } else if (result.reason === 'diff_cook') {
      Alert.alert(
        'Different Kitchen',
        'Your cart contains items from another home chef. Would you like to clear your cart and add this dish instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear Cart & Add',
            style: 'destructive',
            onPress: () => {
              clearCart();
              addItem(meal, 1);
              setToastMessage(`Added "${meal.name}" to cart`);
              setShowCartToast(true);
              if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
              toastTimeoutRef.current = setTimeout(() => {
                setShowCartToast(false);
              }, 4000);
            },
          },
        ]
      );
    } else if (result.reason === 'no_portions') {
      Alert.alert('Out of Stock', 'Sorry, no more portions available for this meal.');
    }
  };

  const fetchMeals = async (cat: string) => {
    try {
      const categoryParam = cat && cat !== 'ALL' ? `?category=${cat}` : '';
      const response = await api.get(`/api/meals${categoryParam}`);
      setMeals(response.data || []);
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiCombos = async () => {
    setLoadingAi(true);
    try {
      const response = await api.get('/api/combos/recommendations');
      if (response.data && response.data.length > 0) {
        setAiCombos(response.data);
      } else {
        const allCombosRes = await api.get('/api/combos');
        if (allCombosRes.data && allCombosRes.data.length > 0) {
          const formatted = allCombosRes.data.map((c: any) => ({
            combo: c,
            tag: `${c.discountPercentage || 15}% OFF COMBO`,
            reason: c.description || `Fresh bundled feast package by Chef ${c.cookName}.`,
          }));
          setAiCombos(formatted);
        } else {
          setAiCombos([]);
        }
      }
    } catch {
      try {
        const allCombosRes = await api.get('/api/combos');
        if (allCombosRes.data && allCombosRes.data.length > 0) {
          const formatted = allCombosRes.data.map((c: any) => ({
            combo: c,
            tag: `${c.discountPercentage || 15}% OFF COMBO`,
            reason: c.description || `Fresh bundled feast package by Chef ${c.cookName}.`,
          }));
          setAiCombos(formatted);
        }
      } catch {
        // Fallback silently
      }
    } finally {
      setLoadingAi(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchMeals(filters.category), fetchAiCombos()]);
    setRefreshing(false);
  }, [filters.category]);

  useEffect(() => {
    fetchMeals(filters.category);
  }, [filters.category]);

  useEffect(() => {
    fetchMeals(filters.category);
    fetchAiCombos();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchMeals(filters.category);
      fetchAiCombos();
    });
    return unsubscribe;
  }, [navigation, filters.category]);

  const getProcessedMeals = () => {
    let processed = meals.filter((meal) => {
      if (
        filters.category &&
        filters.category !== 'ALL' &&
        meal.category !== filters.category
      ) {
        return false;
      }

      if (filters.dietaryPreferences && filters.dietaryPreferences.length > 0) {
        const mealDietary: string[] = meal.dietaryPreferences || [];
        const matchesAll = filters.dietaryPreferences.every((pref) =>
          mealDietary.some((dp) => dp.toLowerCase() === pref.toLowerCase())
        );
        if (!matchesAll) return false;
      }

      if (filters.district) {
        if (!meal.cookDistrict || meal.cookDistrict.toLowerCase() !== filters.district.toLowerCase()) {
          return false;
        }
      }

      if (filters.town) {
        if (!meal.cookTown || meal.cookTown.toLowerCase() !== filters.town.toLowerCase()) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = (meal.name || '').toLowerCase().includes(query);
        const matchCook = (meal.cookName || '').toLowerCase().includes(query);
        const matchCat = (meal.category || '').toLowerCase().includes(query);
        const matchCuisine = (meal.cuisineType || '').toLowerCase().includes(query);
        const matchTown = (meal.cookTown || '').toLowerCase().includes(query);
        const matchDistrict = (meal.cookDistrict || '').toLowerCase().includes(query);
        const matchDietary = (meal.dietaryPreferences || []).some((dp: string) =>
          dp.toLowerCase().includes(query)
        );

        if (
          !matchName &&
          !matchCook &&
          !matchCat &&
          !matchCuisine &&
          !matchTown &&
          !matchDistrict &&
          !matchDietary
        ) {
          return false;
        }
      }

      return true;
    });

    if (sortBy === 'rating') {
      processed.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
    } else if (sortBy === 'price') {
      processed.sort((a, b) => a.price - b.price);
    }

    return processed;
  };

  const processedMeals = getProcessedMeals();

  return (
    <View className="flex-1 bg-surface-elevated relative">
      {/* Liquid Background Blobs */}
      <View className="absolute w-72 h-72 rounded-full bg-primary/5 -top-20 -left-20 blur-3xl opacity-40" />
      <View className="absolute w-80 h-80 rounded-full bg-secondary/5 top-80 -right-20 blur-3xl opacity-30" />

      {/* Modern Sticky Header */}
      <View className="bg-white border-b border-gray-100 px-6 pt-12 pb-4 shadow-sm z-10">
        <View className="flex-row justify-between items-center mb-3">
          <View>
            <Text className="text-textPrimary font-black text-lg">NeighborPlates</Text>
          </View>
          <View className="border border-primary/20 bg-primary/10 rounded-full px-3.5 py-1.5 flex-row items-center gap-1">
            <Ionicons name="sparkles" size={10} color="#FF6B35" />
            <Text className="text-primary font-black text-[9px] uppercase tracking-wider">Fresh & Local</Text>
          </View>
        </View>

        {/* Search bar with Filter button trigger */}
        <View className="flex-row items-center gap-3">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-2xl px-4 py-2.5 border border-gray-200 shadow-inner">
            <Feather name="search" size={16} color="#6B7280" className="mr-2" />
            <TextInput
              placeholder="Search dishes, home chefs, towns..."
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

          {/* Quick Sort Toggle Button */}
          <TouchableOpacity 
            onPress={() => setSortBy(prev => prev === 'rating' ? 'price' : prev === 'price' ? 'none' : 'rating')}
            className={`p-3 rounded-2xl border ${sortBy !== 'none' ? 'bg-primary/10 border-primary/30' : 'bg-gray-100 border-gray-200'}`}
          >
            <Feather name="arrow-down" size={16} color={sortBy !== 'none' ? '#FF6B35' : '#6B7280'} />
          </TouchableOpacity>

          {/* Main Pop-up Filter Trigger Button */}
          {(() => {
            const activeCount =
              (filters.category !== 'ALL' && filters.category !== '' ? 1 : 0) +
              filters.dietaryPreferences.length +
              (filters.district ? 1 : 0) +
              (filters.town ? 1 : 0);

            return (
              <TouchableOpacity
                onPress={() => setFilterModalVisible(true)}
                className={`p-3 rounded-2xl border relative ${
                  activeCount > 0 ? 'bg-primary border-primary' : 'bg-gray-100 border-gray-200'
                }`}
                activeOpacity={0.8}
              >
                <Feather name="sliders" size={16} color={activeCount > 0 ? '#FFFFFF' : '#6B7280'} />
                {activeCount > 0 && (
                  <View className="absolute -top-1.5 -right-1.5 bg-primary rounded-full w-5 h-5 items-center justify-center border-2 border-white">
                    <Text className="text-white text-[9px] font-black">{activeCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })()}
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
          {/* Welcome Info with Registered User Name */}
          <View className="mb-5">
            <Text className="text-textSecondary text-xs font-bold uppercase tracking-wider">
              Welcome back, {user?.name || 'Neighbor'}
            </Text>
            <Text className="text-textPrimary text-2xl font-black tracking-tight mt-0.5">
              Discover Home Kitchens
            </Text>
          </View>

          {/* ─── FEATURED AI COMBO DEALS SECTION ─── */}
          <View className="mb-7">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center gap-1.5">
                <Feather name="gift" size={14} color="#FF6B35" />
                <Text className="text-textPrimary font-black text-sm uppercase tracking-wider">
                  Featured Combo Deals
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setFilters(prev => ({ ...prev, category: 'COMBO' }))}
                className="bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full flex-row items-center gap-1"
                activeOpacity={0.7}
              >
                <Ionicons name="sparkles" size={10} color="#FF6B35" />
                <Text className="text-primary font-black text-[9px] uppercase tracking-wide">AI Deals</Text>
              </TouchableOpacity>
            </View>

            {aiCombos.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={300}
                decelerationRate="fast"
              >
                {aiCombos.map((item, idx) => {
                  const combo = item.combo;
                  if (!combo) return null;
                  const discount = combo.discountPercentage || 15;
                  const savings = Math.round((combo.originalTotalPrice || combo.price) - combo.price);
                  const comboImage =
                    (combo.photos && combo.photos.length > 0 && combo.photos[0]) ||
                    (item.includedMeals && item.includedMeals.find((m: any) => m.photo)?.photo) ||
                    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800';

                  return (
                    <TouchableOpacity 
                      key={combo.id || `combo-${idx}`}
                      onPress={() => navigation.navigate('MealDetail', { mealId: combo.id })}
                      activeOpacity={0.88}
                      className="w-80 rounded-3xl mr-4 border border-white/20 shadow-lg relative overflow-hidden h-44 justify-between p-4"
                      style={{ backgroundColor: '#1A1A2E' }}
                    >
                      <Image
                        source={{ uri: comboImage }}
                        className="absolute inset-0 w-full h-full"
                        resizeMode="cover"
                      />
                      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(12, 12, 22, 0.70)' }} />
                      
                      {/* Top Badges */}
                      <View className="flex-row items-center justify-between z-10">
                        <View className="bg-primary/95 px-2.5 py-1 rounded-full flex-row items-center gap-1 shadow-sm">
                          <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                          <Text className="text-white text-[9px] font-black tracking-wider uppercase">
                            {item.tag || `${discount}% OFF BUNDLE`}
                          </Text>
                        </View>
                        <View className="bg-black/60 border border-white/25 px-2.5 py-1 rounded-full flex-row items-center gap-1.5">
                          {combo.originalTotalPrice > combo.price && (
                            <Text className="text-white/50 text-[10px] line-through font-semibold">
                              LKR {Math.round(combo.originalTotalPrice)}
                            </Text>
                          )}
                          <Text className="text-emerald-400 font-black text-xs">
                            LKR {Math.round(combo.price)}
                          </Text>
                        </View>
                      </View>

                      {/* Details */}
                      <View className="z-10 my-auto">
                        <Text className="text-white font-black text-lg leading-6 mb-1 shadow-sm" numberOfLines={1}>
                          {combo.name}
                        </Text>
                        <Text className="text-white/90 text-xs font-medium leading-4" numberOfLines={2}>
                          {item.reason || combo.description || `Fresh bundled feast by Chef ${combo.cookName}. Save LKR ${savings}!`}
                        </Text>
                      </View>

                      {/* Footer */}
                      <View className="flex-row justify-between items-center pt-2 border-t border-white/20 z-10">
                        <View className="flex-row items-center gap-1.5">
                          <View className="w-5 h-5 rounded-full bg-white/20 items-center justify-center">
                            <Feather name="user" size={10} color="#FFFFFF" />
                          </View>
                          <Text className="text-white/85 text-[11px] font-bold tracking-wide">
                            Chef {combo.cookName || 'Home Cook'}
                          </Text>
                        </View>
                        <View className="bg-primary px-3 py-1 rounded-full flex-row items-center gap-1 shadow-sm">
                          <Text className="text-white font-black text-[10px] tracking-wider">ORDER NOW</Text>
                          <Feather name="arrow-right" size={10} color="#FFFFFF" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View 
                className="w-full rounded-3xl p-5 border border-white/15 shadow-md relative overflow-hidden h-44 justify-between"
                style={{ backgroundColor: '#1A1A2E' }}
              >
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800' }}
                  className="absolute inset-0 w-full h-full"
                  resizeMode="cover"
                />
                <View className="absolute inset-0" style={{ backgroundColor: 'rgba(12, 12, 22, 0.75)' }} />
                
                <View className="z-10">
                  <View className="bg-primary/95 px-2.5 py-1 rounded-full self-start mb-2 flex-row items-center gap-1 shadow-sm">
                    <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                    <Text className="text-white text-[9px] font-black tracking-widest uppercase">AI MEAL BUNDLES</Text>
                  </View>
                  <Text className="text-white font-black text-lg mb-1">Custom Combo Deals Coming Up</Text>
                  <Text className="text-white/80 text-xs font-semibold">Home chefs are preparing exciting meal bundles with special discounts for you!</Text>
                </View>
                <View className="flex-row items-center gap-1 self-end bg-white/15 px-3 py-1 rounded-full border border-white/25 z-10">
                  <Text className="text-white font-bold text-[10px]">CHECK BACK SOON</Text>
                </View>
              </View>
            )}
          </View>

          {/* ─── SIDE-BY-SIDE ALL ACTIVE KITCHENS FEED ─── */}
          <View className="mb-24">
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
              <View className="py-12 justify-center items-center bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                <Feather name="inbox" size={40} color="#9CA3AF" className="mb-3" />
                <Text className="text-textPrimary font-bold text-sm mb-1 text-center">No matching meals found</Text>
                <Text className="text-textSecondary text-xs text-center">Try editing your search query or reset filter options.</Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {processedMeals.map((meal) => (
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
                    layout="grid"
                    onPress={() => navigation.navigate('MealDetail', { mealId: meal.id })}
                    onAddToCart={() => handleAddToCart(meal)}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modern Floating Toast message for Add to Cart */}
      {showCartToast && cartItemCount > 0 && (
        <View className="absolute bottom-20 left-4 right-4 bg-gray-900 rounded-3xl p-4 shadow-2xl flex-row items-center justify-between border border-gray-800 z-50 animate-fade-in">
          <View className="flex-row items-center gap-3 flex-1 mr-2">
            <View className="w-10 h-10 rounded-2xl bg-primary items-center justify-center">
              <Feather name="shopping-bag" size={20} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-extrabold text-xs" numberOfLines={1}>
                {toastMessage || 'Item added to cart'}
              </Text>
              <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                {cartItemCount} {cartItemCount === 1 ? 'Item' : 'Items'} in Cart
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('HomeTabs', { screen: 'Cart' })}
            className="bg-primary px-3.5 py-2.5 rounded-2xl flex-row items-center gap-1.5 shadow-sm shrink-0"
            style={{ flexShrink: 0 }}
            activeOpacity={0.8}
          >
            <Text className="text-white font-black text-xs uppercase tracking-wider" numberOfLines={1}>
              View Cart
            </Text>
            <Feather name="arrow-right" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Pop-up Filter Modal Component */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        onApplyFilters={(newFilters) => setFilters(newFilters)}
        onResetFilters={() =>
          setFilters({
            category: 'ALL',
            dietaryPreferences: [],
            district: '',
            town: '',
          })
        }
      />
    </View>
  );
};
