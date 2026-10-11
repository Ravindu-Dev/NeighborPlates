import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Toast } from '../../components/common/Toast';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  dark:        '#0F1923',
  darkMid:     '#132235',
  darkCard:    '#162438',
  darkBorder:  '#1E324D',
  green:       '#2D6A4F',
  greenLight:  '#52B788',
  greenGlow:   '#40916C',
  orange:      '#FF6B35',
  amber:       '#F59E0B',
  blue:        '#3B82F6',
  blueLight:   '#60A5FA',
  purple:      '#8B5CF6',
  red:         '#EF4444',
  redLight:    '#F87171',
  white:       '#FFFFFF',
  surface:     '#F4F7FB',
  cardBg:      '#FFFFFF',
  text1:       '#0F1923',
  text2:       '#5A6E85',
  text3:       '#94A3B8',
  borderLight: '#E2E8F0',
};

const CATEGORY_ICONS: Record<string, string> = {
  BREAKFAST: '🥞',
  LUNCH:     '🍛',
  DINNER:    '🍲',
  SNACK:     '🍿',
  COMBO:     '🎁',
};

export const CreateListingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const [cookMeals, setCookMeals] = useState<any[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');

  // Modals
  const [portionModalMeal, setPortionModalMeal] = useState<any | null>(null);
  const [newPortionsCount, setNewPortionsCount] = useState<string>('10');
  const [savingPortions, setSavingPortions] = useState<boolean>(false);
  const [optionsModalMeal, setOptionsModalMeal] = useState<any | null>(null);

  // Animation values
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(-15)).current;

  const fetchCookMeals = async () => {
    try {
      setLoadingMeals(true);
      const profRes = await api.get('/api/users/profile');
      const cookId = profRes.data?.id || user?.id;
      if (cookId) {
        const mealsRes = await api.get(`/api/meals/cook/${cookId}`);
        const items = (mealsRes.data || []).filter((m: any) => !m.combo);
        setCookMeals(items);
      }
    } catch (err) {
      console.error('Error fetching cook meals:', err);
    } finally {
      setLoadingMeals(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCookMeals();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCookMeals();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (!loadingMeals) {
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(heroSlide, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [loadingMeals]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCookMeals();
  };

  const handleAddNewMeal = () => {
    navigation.navigate('AddMealForm');
  };

  const handleEditCookMeal = (meal: any) => {
    navigation.navigate('AddMealForm', { mealToEdit: meal });
  };

  const handleToggleTakingOrders = async (meal: any) => {
    const isCurrentlyActive = Boolean(meal.active);
    const nextActiveState = !isCurrentlyActive;
    const defaultPortions = (meal.portionsRemaining && meal.portionsRemaining > 0)
      ? meal.portionsRemaining
      : (meal.portionLimit && meal.portionLimit > 0 ? meal.portionLimit : 10);
    const nextPortions = nextActiveState ? defaultPortions : 0;

    // Optimistically update UI
    setCookMeals((prev) =>
      prev.map((m) =>
        m.id === meal.id
          ? {
              ...m,
              active: nextActiveState,
              portionsRemaining: nextPortions,
            }
          : m
      )
    );

    try {
      let res;
      try {
        res = await api.patch(`/api/meals/${meal.id}/toggle-status`);
      } catch (patchErr) {
        res = await api.put(`/api/meals/${meal.id}`, {
          name: meal.name,
          description: meal.description,
          price: meal.price,
          category: meal.category || 'LUNCH',
          cuisineType: meal.cuisineType || 'Sri Lankan',
          photos: meal.photos || [],
          ingredients: meal.ingredients || [],
          allergenTags: meal.allergenTags || [],
          dietaryPreferences: meal.dietaryPreferences || [],
          portionLimit: meal.portionLimit || 10,
          portionsRemaining: nextPortions,
          availability: meal.availability || { cutoffTime: '09:00', servingTime: '12:00', days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] },
          active: nextActiveState,
        });
      }

      if (res && res.data) {
        setCookMeals((prev) =>
          prev.map((m) => (m.id === meal.id ? { ...m, ...res.data, active: nextActiveState } : m))
        );
      }
      setToast({
        visible: true,
        message: nextActiveState
          ? `🟢 "${meal.name}" is now Available & taking orders!`
          : `⏸️ "${meal.name}" is now Paused`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error toggling meal status:', err);
      // Revert optimistic update
      setCookMeals((prev) =>
        prev.map((m) => (m.id === meal.id ? { ...m, active: isCurrentlyActive } : m))
      );
      setToast({
        visible: true,
        message: 'Failed to update meal status.',
        type: 'error',
      });
    }
  };

  const handleOpenPortionModal = (meal: any) => {
    setPortionModalMeal(meal);
    setNewPortionsCount(String(meal.portionsRemaining ?? meal.portionLimit ?? 10));
  };

  const handleSavePortions = async () => {
    if (!portionModalMeal) return;
    const count = parseInt(newPortionsCount, 10);
    if (isNaN(count) || count < 0) {
      setToast({ visible: true, message: 'Please enter a valid portion number', type: 'error' });
      return;
    }

    setSavingPortions(true);
    try {
      await api.patch(`/api/meals/${portionModalMeal.id}/portions?portions=${count}`);
      setCookMeals((prev) =>
        prev.map((m) =>
          m.id === portionModalMeal.id
            ? { ...m, portionsRemaining: count, portionLimit: Math.max(m.portionLimit || 0, count) }
            : m
        )
      );
      setToast({
        visible: true,
        message: `🍱 Portions updated to ${count} for "${portionModalMeal.name}"`,
        type: 'success',
      });
      setPortionModalMeal(null);
    } catch (err) {
      console.error(err);
      setToast({ visible: true, message: 'Failed to update portions', type: 'error' });
    } finally {
      setSavingPortions(false);
    }
  };

  const handleDeleteCookMeal = async (mealId: string) => {
    const deleteAction = async () => {
      try {
        await api.delete(`/api/meals/${mealId}`);
        setCookMeals((prev) => prev.filter((m) => m.id !== mealId));
        setToast({ visible: true, message: 'Meal deleted successfully', type: 'success' });
        fetchCookMeals();
      } catch (error) {
        console.error(error);
        setToast({ visible: true, message: 'Failed to delete meal', type: 'error' });
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to permanently delete this meal?')) {
        deleteAction();
      }
    } else {
      Alert.alert('Delete Meal', 'Are you sure you want to permanently delete this meal?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteAction },
      ]);
    }
  };

  // Metrics
  const totalMeals = cookMeals.length;
  const activeMeals = cookMeals.filter((m) => Boolean(m.active));
  const pausedMeals = cookMeals.filter((m) => !m.active);
  const totalPortionsAvailable = activeMeals.reduce((sum, m) => sum + (m.portionsRemaining ?? 0), 0);

  // Category counts
  const breakfastCount = cookMeals.filter((m) => m.category === 'BREAKFAST').length;
  const lunchCount = cookMeals.filter((m) => m.category === 'LUNCH').length;
  const dinnerCount = cookMeals.filter((m) => m.category === 'DINNER').length;
  const snackCount = cookMeals.filter((m) => m.category === 'SNACK').length;

  const categoryChips = [
    { key: 'ALL', label: 'All Dishes', count: cookMeals.length, icon: '🍽️' },
    { key: 'BREAKFAST', label: 'Breakfast', count: breakfastCount, icon: '🥞' },
    { key: 'LUNCH', label: 'Lunch', count: lunchCount, icon: '🍛' },
    { key: 'DINNER', label: 'Dinner', count: dinnerCount, icon: '🍲' },
  ];
  if (snackCount > 0) {
    categoryChips.push({ key: 'SNACK', label: 'Snacks', count: snackCount, icon: '🍿' });
  }

  // Filtered Meals
  const filteredMeals = cookMeals.filter((meal) => {
    // Category match
    const matchesCategory = selectedCategory === 'ALL' || meal.category === selectedCategory;

    // Status filter match
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && Boolean(meal.active)) ||
      (statusFilter === 'PAUSED' && !meal.active);

    // Search query match
    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesCategory && matchesStatus;

    const matchesQuery =
      (meal.name || '').toLowerCase().includes(query) ||
      (meal.description || '').toLowerCase().includes(query) ||
      (meal.cuisineType || '').toLowerCase().includes(query) ||
      (meal.category || '').toLowerCase().includes(query) ||
      (meal.ingredients || []).some((ing: string) => ing.toLowerCase().includes(query));

    return matchesCategory && matchesStatus && matchesQuery;
  });

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />

      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.greenLight}
            colors={[C.greenLight]}
            progressBackgroundColor={C.darkCard}
          />
        }
      >
        {/* ─── Hero Header Banner ─── */}
        <LinearGradient
          colors={['#0F1923', '#0D2137', '#0F2B1A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.hero}
        >
          <View style={S.blobTopRight} />
          <View style={S.blobBottomLeft} />

          <Animated.View
            style={[
              S.heroContent,
              {
                opacity: heroOpacity,
                transform: [{ translateY: heroSlide }],
              },
            ]}
          >
            {/* Top Pill / Badge */}
            <View style={S.heroBadgeRow}>
              <View style={S.heroTagPill}>
                <Ionicons name="restaurant" size={12} color={C.greenLight} style={{ marginRight: 5 }} />
                <Text style={S.heroTagText}>CHEF MENU HUB</Text>
              </View>

              <View style={S.kitchenIndicator}>
                <View style={[S.liveDot, { backgroundColor: activeMeals.length > 0 ? '#10B981' : '#F59E0B' }]} />
                <Text style={S.kitchenIndicatorText}>
                  {activeMeals.length > 0 ? `${activeMeals.length} Dishes Live` : 'Kitchen Idle'}
                </Text>
              </View>
            </View>

            {/* Header Titles */}
            <Text style={S.heroTitle}>Culinary Listings</Text>
            <Text style={S.heroSubtitle}>
              Craft your offerings, schedule meal drops, and adjust portions in real-time.
            </Text>

            {/* Quick Metrics Bar */}
            <View style={S.metricsBar}>
              <View style={S.metricItem}>
                <Text style={S.metricVal}>{totalMeals}</Text>
                <Text style={S.metricLbl}>Total Dishes</Text>
              </View>
              <View style={S.metricSep} />
              <View style={S.metricItem}>
                <Text style={[S.metricVal, { color: C.greenLight }]}>{activeMeals.length}</Text>
                <Text style={S.metricLbl}>Taking Orders</Text>
              </View>
              <View style={S.metricSep} />
              <View style={S.metricItem}>
                <Text style={[S.metricVal, { color: C.blueLight }]}>{totalPortionsAvailable}</Text>
                <Text style={S.metricLbl}>Portions Left</Text>
              </View>
            </View>

            {/* Action Bar (Add Meal Button + Combo Deals) */}
            <View style={S.actionRow}>
              {/* Primary Add Dish Button */}
              <TouchableOpacity
                onPress={handleAddNewMeal}
                activeOpacity={0.88}
                style={S.addDishBtn}
              >
                <LinearGradient
                  colors={[C.greenLight, C.green]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={S.addDishGradient}
                >
                  <View style={S.addIconWrap}>
                    <Feather name="plus" size={18} color={C.white} />
                  </View>
                  <Text style={S.addDishText}>Add New Dish</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Combo Deals Button */}
              <TouchableOpacity
                onPress={() => navigation.navigate('ComboDeals')}
                activeOpacity={0.85}
                style={S.comboBtn}
              >
                <LinearGradient
                  colors={['#1E293B', '#0F172A']}
                  style={S.comboGradient}
                >
                  <Text style={{ fontSize: 16, marginRight: 6 }}>🎁</Text>
                  <Text style={S.comboText}>Combos</Text>
                  <View style={S.sparkleBadge}>
                    <Ionicons name="sparkles" size={10} color="#FBBF24" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* ─── Search & Filters Bar ─── */}
        <View style={S.filtersContainer}>
          {/* Search Box */}
          <View style={S.searchBox}>
            <Feather name="search" size={16} color={C.text3} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search by meal name, ingredients, or cuisine..."
              placeholderTextColor={C.text3}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={S.searchInput}
            />
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={18} color={C.text3} />
              </TouchableOpacity>
            )}
          </View>

          {/* Status Filter Chips (All, Live Now, Paused) */}
          <View style={S.statusRow}>
            {(['ALL', 'ACTIVE', 'PAUSED'] as const).map((st) => {
              const active = statusFilter === st;
              const labels = { ALL: 'All Statuses', ACTIVE: '🟢 Live Now', PAUSED: '⏸️ Paused' };
              return (
                <TouchableOpacity
                  key={st}
                  onPress={() => setStatusFilter(st)}
                  activeOpacity={0.75}
                  style={[S.statusChip, active && S.statusChipActive]}
                >
                  <Text style={[S.statusChipText, active && S.statusChipTextActive]}>
                    {labels[st]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Category Chips ScrollView */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.categoriesScroll}
          >
            {categoryChips.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setSelectedCategory(cat.key)}
                  activeOpacity={0.8}
                  style={[S.catChip, isSelected && S.catChipActive]}
                >
                  <Text style={{ fontSize: 13, marginRight: 6 }}>{cat.icon}</Text>
                  <Text style={[S.catLabel, isSelected && S.catLabelActive]}>
                    {cat.label}
                  </Text>
                  <View style={[S.catCountBadge, isSelected && S.catCountBadgeActive]}>
                    <Text style={[S.catCountText, isSelected && S.catCountTextActive]}>
                      {cat.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ─── Meals List Section ─── */}
        <View style={S.mealsListContainer}>
          <View style={S.sectionHeader}>
            <View>
              <Text style={S.sectionTitle}>
                {selectedCategory === 'ALL'
                  ? 'All Listed Dishes'
                  : `${selectedCategory.charAt(0) + selectedCategory.slice(1).toLowerCase()} Specialties`}
              </Text>
              <Text style={S.sectionSub}>
                {filteredMeals.length} {filteredMeals.length === 1 ? 'dish' : 'dishes'} match your current filter
              </Text>
            </View>
          </View>

          {loadingMeals && !refreshing ? (
            <View style={S.loadingCard}>
              <ActivityIndicator size="small" color={C.greenLight} />
              <Text style={S.loadingText}>Syncing kitchen menu...</Text>
            </View>
          ) : cookMeals.length === 0 ? (
            <View style={S.emptyCard}>
              <View style={S.emptyIconWrap}>
                <Text style={{ fontSize: 44 }}>🍲</Text>
              </View>
              <Text style={S.emptyTitle}>Your Kitchen is Ready!</Text>
              <Text style={S.emptyDesc}>
                You haven't added any dishes to your menu yet. Add your signature recipes to start receiving orders from neighbors.
              </Text>
              <TouchableOpacity
                onPress={handleAddNewMeal}
                activeOpacity={0.85}
                style={S.emptyAddBtn}
              >
                <LinearGradient
                  colors={[C.greenLight, C.green]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={S.emptyAddGradient}
                >
                  <Feather name="plus-circle" size={16} color={C.white} style={{ marginRight: 6 }} />
                  <Text style={S.emptyAddText}>Create First Meal Listing</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : filteredMeals.length === 0 ? (
            <View style={S.emptyFilterCard}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🔍</Text>
              <Text style={S.emptyTitle}>No Matching Dishes</Text>
              <Text style={S.emptyDesc}>
                {searchQuery.trim()
                  ? `No dishes matched "${searchQuery}". Try adjusting your keywords or category filter.`
                  : `No dishes found under ${selectedCategory} with status "${statusFilter}".`}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setStatusFilter('ALL');
                }}
                style={S.resetFiltersBtn}
              >
                <Text style={S.resetFiltersText}>Reset All Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredMeals.map((meal) => {
              const isAvailable = Boolean(meal.active);
              const portionsLeft = meal.portionsRemaining ?? meal.portionLimit ?? 10;
              const maxPortions = Math.max(meal.portionLimit || 10, portionsLeft);
              const portionPct = maxPortions > 0 ? (portionsLeft / maxPortions) * 100 : 0;
              const prepTimeText = meal.availability?.servingTime
                ? `${meal.availability.servingTime} ready`
                : '30m prep';

              return (
                <View key={meal.id} style={S.mealCard}>
                  {/* Photo Container */}
                  <View style={S.mealPhotoContainer}>
                    {meal.photos && meal.photos.length > 0 ? (
                      <Image
                        source={{ uri: meal.photos[0] }}
                        style={S.mealPhoto}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={['#162438', '#0F1923']}
                        style={S.mealPhotoPlaceholder}
                      >
                        <Text style={{ fontSize: 52 }}>
                          {CATEGORY_ICONS[meal.category] || '🍛'}
                        </Text>
                      </LinearGradient>
                    )}

                    {/* Gradient scrim for text readability */}
                    <LinearGradient
                      colors={['transparent', 'rgba(15, 25, 35, 0.85)']}
                      style={S.photoScrim}
                    />

                    {/* Top Status Badge (Live vs Paused) */}
                    <View
                      style={[
                        S.statusBadge,
                        {
                          backgroundColor: isAvailable ? 'rgba(16, 185, 129, 0.95)' : 'rgba(245, 158, 11, 0.95)',
                        },
                      ]}
                    >
                      <View style={[S.statusBadgeDot, { backgroundColor: isAvailable ? '#FFFFFF' : '#78350F' }]} />
                      <Text style={[S.statusBadgeText, { color: isAvailable ? '#FFFFFF' : '#451A03' }]}>
                        {isAvailable ? 'LIVE & AVAILABLE' : 'PAUSED'}
                      </Text>
                    </View>

                    {/* Category Tag (Top Right) */}
                    <View style={S.categoryTag}>
                      <Text style={S.categoryTagText}>
                        {CATEGORY_ICONS[meal.category] || '🍽️'} {meal.category}
                      </Text>
                    </View>

                    {/* Bottom Photo Overlay Info (Portions left) */}
                    <View style={S.photoBottomBar}>
                      <View style={S.portionsPill}>
                        <Feather name="package" size={12} color={isAvailable ? C.greenLight : C.amber} style={{ marginRight: 5 }} />
                        <Text style={[S.portionsText, { color: isAvailable ? '#E8F5E9' : '#FEF3C7' }]}>
                          {isAvailable ? `${portionsLeft} portions left` : 'Sold out / Inactive'}
                        </Text>
                      </View>

                      {meal.cuisineType && (
                        <View style={S.cuisinePill}>
                          <Text style={S.cuisineText}>{meal.cuisineType}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Portions Capacity Progress Bar */}
                  {isAvailable && (
                    <View style={S.capacityBarBg}>
                      <View
                        style={[
                          S.capacityBarFill,
                          {
                            width: `${Math.min(portionPct, 100)}%`,
                            backgroundColor: portionPct > 30 ? C.greenLight : C.amber,
                          },
                        ]}
                      />
                    </View>
                  )}

                  {/* Meal Content Details */}
                  <View style={S.mealBody}>
                    {/* Header Row: Title & Toggle */}
                    <View style={S.titleRow}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={S.mealTitle} numberOfLines={1}>
                          {meal.name}
                        </Text>
                        <View style={S.metaRow}>
                          <Text style={S.mealPrice}>LKR {Number(meal.price || 0).toLocaleString()}</Text>
                          <Text style={S.metaDot}>•</Text>
                          <Feather name="clock" size={12} color={C.text2} style={{ marginRight: 4 }} />
                          <Text style={S.metaTime}>{prepTimeText}</Text>
                        </View>
                      </View>

                      {/* Taking Orders Toggle */}
                      <View style={S.toggleWrapper}>
                        <Text style={[S.toggleLabel, { color: isAvailable ? C.green : C.text2 }]}>
                          {isAvailable ? 'Live' : 'Off'}
                        </Text>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => handleToggleTakingOrders(meal)}
                          style={[
                            S.toggleTrack,
                            { backgroundColor: isAvailable ? C.green : '#CBD5E1' },
                          ]}
                        >
                          <View
                            style={[
                              S.toggleThumb,
                              { transform: [{ translateX: isAvailable ? 20 : 0 }] },
                            ]}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Description */}
                    <Text style={S.mealDesc} numberOfLines={2}>
                      {meal.description || 'Delicious, freshly made home recipe prepared with premium ingredients.'}
                    </Text>

                    {/* Ingredients Chips Preview */}
                    {meal.ingredients && meal.ingredients.length > 0 && (
                      <View style={S.ingWrap}>
                        {meal.ingredients.slice(0, 3).map((ing: string, i: number) => (
                          <View key={i} style={S.ingChip}>
                            <Text style={S.ingText} numberOfLines={1}>{ing}</Text>
                          </View>
                        ))}
                        {meal.ingredients.length > 3 && (
                          <View style={S.ingChipMore}>
                            <Text style={S.ingMoreText}>+{meal.ingredients.length - 3}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Action Buttons Toolbar */}
                    <View style={S.actionToolbar}>
                      {/* Edit Details */}
                      <TouchableOpacity
                        onPress={() => handleEditCookMeal(meal)}
                        activeOpacity={0.8}
                        style={S.editBtn}
                      >
                        <Feather name="edit-3" size={14} color={C.green} style={{ marginRight: 6 }} />
                        <Text style={S.editBtnText}>Edit Details</Text>
                      </TouchableOpacity>

                      {/* Quick Portions Adjuster */}
                      <TouchableOpacity
                        onPress={() => handleOpenPortionModal(meal)}
                        activeOpacity={0.8}
                        style={S.portionsBtn}
                        accessibilityLabel="Adjust Portions"
                      >
                        <Feather name="sliders" size={15} color={C.text1} />
                        <Text style={S.portionsBtnText}>Portions</Text>
                      </TouchableOpacity>

                      {/* Options Menu */}
                      <TouchableOpacity
                        onPress={() => setOptionsModalMeal(meal)}
                        activeOpacity={0.8}
                        style={S.moreBtn}
                        accessibilityLabel="More Options"
                      >
                        <Feather name="more-vertical" size={16} color={C.text1} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ─── Deluxe Action Sheet Modal ─── */}
      <Modal
        visible={!!optionsModalMeal}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsModalMeal(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setOptionsModalMeal(null)}
          style={S.modalOverlay}
        >
          <View style={S.actionSheet}>
            <View style={S.sheetHandle} />
            <Text style={S.sheetTitle} numberOfLines={1}>
              {optionsModalMeal?.name}
            </Text>
            <Text style={S.sheetSub}>Listing management & controls</Text>

            <TouchableOpacity
              onPress={() => {
                const m = optionsModalMeal;
                setOptionsModalMeal(null);
                handleEditCookMeal(m);
              }}
              style={S.sheetRow}
            >
              <View style={[S.sheetIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Feather name="edit-3" size={16} color={C.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.sheetRowTitle}>Edit Full Details</Text>
                <Text style={S.sheetRowSub}>Update title, description, photos, and recipe tags</Text>
              </View>
              <Feather name="chevron-right" size={16} color={C.text3} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const m = optionsModalMeal;
                setOptionsModalMeal(null);
                handleOpenPortionModal(m);
              }}
              style={S.sheetRow}
            >
              <View style={[S.sheetIconBox, { backgroundColor: '#ECFDF5' }]}>
                <Feather name="sliders" size={16} color={C.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.sheetRowTitle}>Adjust Remaining Portions</Text>
                <Text style={S.sheetRowSub}>Set how many plates are available today</Text>
              </View>
              <Feather name="chevron-right" size={16} color={C.text3} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const m = optionsModalMeal;
                setOptionsModalMeal(null);
                handleToggleTakingOrders(m);
              }}
              style={S.sheetRow}
            >
              <View style={[S.sheetIconBox, { backgroundColor: '#FFFBEB' }]}>
                <Feather name="power" size={16} color={C.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.sheetRowTitle}>
                  {optionsModalMeal?.active ? 'Pause Taking Orders' : 'Resume Taking Orders'}
                </Text>
                <Text style={S.sheetRowSub}>
                  {optionsModalMeal?.active
                    ? 'Temporarily hide from customer browsing'
                    : 'Make visible to hungry neighbors'}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={C.text3} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const id = optionsModalMeal?.id;
                setOptionsModalMeal(null);
                if (id) handleDeleteCookMeal(id);
              }}
              style={[S.sheetRow, { borderBottomWidth: 0 }]}
            >
              <View style={[S.sheetIconBox, { backgroundColor: '#FEF2F2' }]}>
                <Feather name="trash-2" size={16} color={C.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.sheetRowTitle, { color: C.red }]}>Delete Listing</Text>
                <Text style={S.sheetRowSub}>Permanently delete this dish from menu</Text>
              </View>
              <Feather name="chevron-right" size={16} color={C.text3} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setOptionsModalMeal(null)}
              style={S.sheetCancelBtn}
            >
              <Text style={S.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Deluxe Quick Portions Stepper Modal ─── */}
      <Modal
        visible={!!portionModalMeal}
        transparent
        animationType="fade"
        onRequestClose={() => setPortionModalMeal(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setPortionModalMeal(null)}
          style={S.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={S.portionModalBox}
          >
            <View style={S.portionHeader}>
              <View>
                <Text style={S.portionTitle}>Update Portions</Text>
                <Text style={S.portionSub} numberOfLines={1}>
                  {portionModalMeal?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPortionModalMeal(null)} style={S.closeModalBtn}>
                <Ionicons name="close" size={20} color={C.text2} />
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <Text style={S.presetLabel}>QUICK SELECT PRESETS</Text>
            <View style={S.presetRow}>
              {[5, 10, 15, 20, 25].map((preset) => {
                const isSelected = newPortionsCount === String(preset);
                return (
                  <TouchableOpacity
                    key={preset}
                    onPress={() => setNewPortionsCount(String(preset))}
                    style={[S.presetBtn, isSelected && S.presetBtnActive]}
                  >
                    <Text style={[S.presetText, isSelected && S.presetTextActive]}>
                      {preset}
                    </Text>
                    <Text style={[S.presetSub, isSelected && S.presetSubActive]}>pcs</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Numeric Stepper Box */}
            <View style={S.stepperBox}>
              <TouchableOpacity
                onPress={() => {
                  const current = parseInt(newPortionsCount, 10) || 0;
                  setNewPortionsCount(String(Math.max(0, current - 1)));
                }}
                style={S.stepperBtn}
              >
                <Feather name="minus" size={20} color={C.text1} />
              </TouchableOpacity>

              <View style={S.stepperInputWrap}>
                <TextInput
                  value={newPortionsCount}
                  onChangeText={setNewPortionsCount}
                  keyboardType="numeric"
                  style={S.stepperInput}
                />
                <Text style={S.stepperUnit}>portions</Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  const current = parseInt(newPortionsCount, 10) || 0;
                  setNewPortionsCount(String(current + 1));
                }}
                style={S.stepperBtn}
              >
                <Feather name="plus" size={20} color={C.text1} />
              </TouchableOpacity>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSavePortions}
              disabled={savingPortions}
              activeOpacity={0.88}
              style={S.savePortionBtn}
            >
              <LinearGradient
                colors={[C.greenLight, C.green]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={S.savePortionGradient}
              >
                {savingPortions ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <>
                    <Feather name="check" size={18} color={C.white} style={{ marginRight: 8 }} />
                    <Text style={S.savePortionText}>Save Portions</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ─── Stylesheet ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Hero Section
  hero: {
    paddingTop: Platform.OS === 'ios' ? 56 : 46,
    paddingHorizontal: 20,
    paddingBottom: 28,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  blobTopRight: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(82, 183, 136, 0.12)',
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(82, 183, 136, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(82, 183, 136, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroTagText: {
    color: C.greenLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  kitchenIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  kitchenIndicatorText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    color: C.white,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 18,
  },

  // Metrics Bar inside Hero
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 36, 56, 0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.darkBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    color: C.white,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  metricLbl: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  metricSep: {
    width: 1,
    height: 26,
    backgroundColor: C.darkBorder,
  },

  // Action Bar in Hero
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addDishBtn: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  addDishGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 8,
  },
  addIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDishText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  comboBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  comboGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  comboText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
    marginRight: 6,
  },
  sparkleBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Filters Section
  filtersContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: C.text1,
    padding: 0,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusChipActive: {
    backgroundColor: '#0F1923',
    borderColor: '#0F1923',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.text2,
  },
  statusChipTextActive: {
    color: C.white,
  },
  categoriesScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catChipActive: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  catLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text1,
    marginRight: 6,
  },
  catLabelActive: {
    color: C.white,
  },
  catCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  catCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  catCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.text2,
  },
  catCountTextActive: {
    color: C.white,
  },

  // Meals List Section
  mealsListContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: C.text1,
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontSize: 11,
    color: C.text3,
    fontWeight: '600',
    marginTop: 2,
  },
  loadingCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingText: {
    fontSize: 12,
    color: C.text2,
    fontWeight: '600',
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: C.text1,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    color: C.text2,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  emptyAddBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    width: '100%',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyAddGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  emptyAddText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyFilterCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resetFiltersBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    marginTop: 4,
  },
  resetFiltersText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text1,
  },

  // Meal Card
  mealCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E8EEF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  mealPhotoContainer: {
    height: 190,
    width: '100%',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  mealPhoto: {
    width: '100%',
    height: '100%',
  },
  mealPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  categoryTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(15, 25, 35, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryTagText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '800',
  },
  photoBottomBar: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portionsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 25, 35, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  portionsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cuisinePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  cuisineText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.dark,
  },
  capacityBarBg: {
    height: 4,
    backgroundColor: '#F1F5F9',
    width: '100%',
  },
  capacityBarFill: {
    height: 4,
  },

  // Meal Body
  mealBody: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  mealTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: C.text1,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  mealPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: C.green,
    letterSpacing: -0.2,
  },
  metaDot: {
    fontSize: 11,
    color: C.text3,
    marginHorizontal: 6,
  },
  metaTime: {
    fontSize: 11,
    fontWeight: '600',
    color: C.text2,
  },

  // Taking Orders Switch
  toggleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },

  // Description
  mealDesc: {
    fontSize: 12,
    color: C.text2,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 10,
  },

  // Ingredients Chips
  ingWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  ingChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ingText: {
    fontSize: 10,
    fontWeight: '600',
    color: C.text2,
  },
  ingChipMore: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ingMoreText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.text1,
  },

  // Action Toolbar
  actionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: 'rgba(45, 106, 79, 0.2)',
    paddingVertical: 9,
    borderRadius: 14,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.green,
  },
  portionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 5,
  },
  portionsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text1,
  },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 25, 35, 0.65)',
    justifyContent: 'flex-end',
  },

  // Action Sheet
  actionSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: C.text1,
    marginBottom: 2,
  },
  sheetSub: {
    fontSize: 12,
    color: C.text3,
    fontWeight: '600',
    marginBottom: 16,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  sheetIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.text1,
    marginBottom: 2,
  },
  sheetRowSub: {
    fontSize: 11,
    fontWeight: '500',
    color: C.text3,
  },
  sheetCancelBtn: {
    marginTop: 14,
    backgroundColor: '#F1F5F9',
    paddingVertical: 13,
    borderRadius: 18,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.text2,
  },

  // Quick Portions Stepper Modal
  portionModalBox: {
    backgroundColor: C.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  portionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  portionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: C.text1,
  },
  portionSub: {
    fontSize: 12,
    color: C.text2,
    fontWeight: '600',
    marginTop: 2,
    maxWidth: SCREEN_WIDTH - 80,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.text3,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: C.green,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '900',
    color: C.text1,
  },
  presetTextActive: {
    color: C.green,
  },
  presetSub: {
    fontSize: 9,
    fontWeight: '700',
    color: C.text3,
    marginTop: 1,
  },
  presetSubActive: {
    color: C.green,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stepperInputWrap: {
    alignItems: 'center',
  },
  stepperInput: {
    fontSize: 32,
    fontWeight: '900',
    color: C.text1,
    textAlign: 'center',
    minWidth: 90,
  },
  stepperUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: C.text3,
    marginTop: -4,
  },
  savePortionBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  savePortionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  savePortionText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
