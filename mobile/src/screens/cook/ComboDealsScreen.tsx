import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
  StyleSheet,
  StatusBar,
  Dimensions,
  TextInput,
  Platform,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Toast } from '../../components/common/Toast';
import {
  requestGalleryPermission,
  pickImageFromGallery,
  uploadImageToImgBB,
  validateImageSize,
} from '../../services/imageService';

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
  text2:       '#475569',
  text3:       '#94A3B8',
  borderLight: '#E2E8F0',
};

interface CookMeal {
  id: string;
  name: string;
  price: number;
  category: string;
  cuisineType: string;
  photos: string[];
  active: boolean;
  combo?: boolean;
}

interface ExistingCombo {
  id: string;
  name: string;
  description: string;
  price: number;
  photos: string[];
  active: boolean;
  includedMealIds: string[];
  originalTotalPrice: number;
  discountPercentage: number;
  portionsRemaining: number;
  cuisineType?: string;
  avgRating: number;
  totalOrders: number;
}

const CATEGORY_EMOJI: Record<string, string> = {
  BREAKFAST: '🥞',
  LUNCH:     '🍛',
  DINNER:    '🍲',
  SNACKS:    '🍿',
  COMBO:     '🎁',
};

const CUISINES = ['Sri Lankan', 'Indian', 'Asian', 'Chinese', 'Western', 'Italian', 'Fusion', 'Desserts'];
const DISCOUNT_PRESETS = [10, 15, 20, 25];

export const ComboDealsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const [cookMeals, setCookMeals] = useState<CookMeal[]>([]);
  const [existingCombos, setExistingCombos] = useState<ExistingCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Mode: 'bundle' (bundle existing meals) vs 'custom' (create new combo from scratch)
  const [createMode, setCreateMode] = useState<'bundle' | 'custom'>('bundle');

  // Shared / Mode 1 Form State
  const [selectedMealIds, setSelectedMealIds] = useState<string[]>([]);
  const [comboName, setComboName] = useState('');
  const [comboDescription, setComboDescription] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState<number>(15);
  const [customDiscountText, setCustomDiscountText] = useState('');
  const [portionLimit, setPortionLimit] = useState('10');

  // Mode 2 (Custom Standalone Combo) Form State
  const [customOriginalPrice, setCustomOriginalPrice] = useState('');
  const [customDealPrice, setCustomDealPrice] = useState('');
  const [customIncludedItems, setCustomIncludedItems] = useState('');
  const [customCuisine, setCustomCuisine] = useState('Sri Lankan');

  // Shared image state
  const [comboImageUrl, setComboImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  // Animation references
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(-15)).current;

  // ─── Gallery Image Picker ───
  const handlePickComboImage = async () => {
    try {
      const hasPermission = await requestGalleryPermission();
      if (!hasPermission) {
        setToast({ visible: true, message: 'Gallery permission is required to upload photos.', type: 'error' });
        return;
      }

      const asset = await pickImageFromGallery();
      if (!asset) return;

      await validateImageSize(asset);

      setComboImageUrl(asset.uri);
      setUploadingImage(true);

      const cdnUrl = await uploadImageToImgBB(asset.uri);
      setComboImageUrl(cdnUrl);
      setToast({ visible: true, message: '📸 Combo cover photo uploaded!', type: 'success' });
    } catch (err: any) {
      console.error('Combo image upload error:', err);
      setComboImageUrl('');
      setToast({
        visible: true,
        message: err.message || 'Failed to upload image. Please select an image under 5 MB.',
        type: 'error',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const mealsRes = await api.get(`/api/meals/cook/${user.id}`);
      const nonCombos = (mealsRes.data || []).filter((m: any) => !m.combo && m.category !== 'COMBO');
      setCookMeals(nonCombos);

      const combosRes = await api.get(`/api/combos/cook/${user.id}`);
      setExistingCombos(combosRes.data || []);
    } catch (err: any) {
      console.error('Error loading cook meals/combos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation, fetchData]);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(heroSlide, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Toggle meal selection (Mode 1)
  const toggleMealSelection = (mealId: string) => {
    setSelectedMealIds((prev) => {
      const isSelected = prev.includes(mealId);
      const next = isSelected ? prev.filter((id) => id !== mealId) : [...prev, mealId];

      if (!isSelected && next.length >= 2 && !comboName) {
        const names = next
          .map((id) => cookMeals.find((m) => m.id === id)?.name)
          .filter(Boolean);
        if (names.length >= 2) {
          setComboName(`${names[0]} & ${names[1]} Combo Feast`);
        }
      }

      return next;
    });
  };

  // Calculations for Mode 1 (Bundle)
  const selectedMeals = cookMeals.filter((m) => selectedMealIds.includes(m.id));
  const bundleOriginalTotal = selectedMeals.reduce((sum, m) => sum + m.price, 0);
  const effectiveDiscount = customDiscountText ? (parseFloat(customDiscountText) || 0) : discountPercentage;
  const bundleComboPrice = Math.round(bundleOriginalTotal * (1 - effectiveDiscount / 100));
  const bundleSavings = Math.max(0, bundleOriginalTotal - bundleComboPrice);
  const bundleChefEarnings = Math.round(bundleComboPrice * 0.9);

  // Calculation for Mode 2 (Custom Standalone)
  const origPriceNum = parseFloat(customOriginalPrice) || 0;
  const dealPriceNum = parseFloat(customDealPrice) || 0;
  const customCalculatedSavings = Math.max(0, origPriceNum - dealPriceNum);
  const customDiscountPercent = origPriceNum > 0 && dealPriceNum > 0
    ? Math.round(((origPriceNum - dealPriceNum) / origPriceNum) * 100)
    : effectiveDiscount;
  const customChefEarnings = Math.round(dealPriceNum * 0.9);

  // Publish Combo Deal
  const handlePublishCombo = async () => {
    if (!comboName.trim()) {
      Alert.alert('Missing Name', 'Please enter a title for your combo deal.');
      return;
    }

    const portions = parseInt(portionLimit, 10);
    if (isNaN(portions) || portions <= 0) {
      Alert.alert('Invalid Portions', 'Please enter a valid number of daily portions (e.g. 10).');
      return;
    }

    let payload: any = null;

    if (createMode === 'bundle') {
      if (selectedMealIds.length < 2) {
        Alert.alert('Select Meals', 'Please select at least 2 dishes to bundle together.');
        return;
      }
      const primaryCuisine = selectedMeals[0]?.cuisineType || 'Home-style';
      const mealPhotos = selectedMeals.flatMap((m) => m.photos || []).filter(Boolean);
      const photos = comboImageUrl ? [comboImageUrl, ...mealPhotos] : mealPhotos;

      payload = {
        name: comboName.trim(),
        description:
          comboDescription.trim() ||
          `Special bundle deal including: ${selectedMeals.map((m) => m.name).join(', ')}. Freshly made and bundled for extra savings!`,
        includedMealIds: selectedMealIds,
        originalTotalPrice: bundleOriginalTotal,
        discountPercentage: effectiveDiscount,
        price: bundleComboPrice,
        portionLimit: portions,
        cuisineType: primaryCuisine,
        photos: photos.slice(0, 3),
        ingredients: Array.from(new Set(selectedMeals.flatMap((m) => (m as any).ingredients || []))),
        allergenTags: Array.from(new Set(selectedMeals.flatMap((m) => (m as any).allergenTags || []))),
        availability: {
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
          cutoffTime: '11:00',
          servingTime: '12:30',
        },
      };
    } else {
      if (dealPriceNum <= 0) {
        Alert.alert('Price Required', 'Please enter a valid combo deal price.');
        return;
      }

      const originalVal = origPriceNum > 0 ? origPriceNum : Math.round(dealPriceNum * 1.25);
      const itemsList = customIncludedItems
        ? customIncludedItems.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      payload = {
        name: comboName.trim(),
        description:
          comboDescription.trim() ||
          (customIncludedItems ? `Bundle includes: ${customIncludedItems}.` : 'Delicious bundled package prepared fresh with special discounts!'),
        includedMealIds: [],
        originalTotalPrice: originalVal,
        discountPercentage: customDiscountPercent > 0 ? customDiscountPercent : 20,
        price: dealPriceNum,
        portionLimit: portions,
        cuisineType: customCuisine,
        photos: comboImageUrl ? [comboImageUrl] : [],
        ingredients: itemsList,
        allergenTags: [],
        availability: {
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
          cutoffTime: '11:00',
          servingTime: '12:30',
        },
      };
    }

    setPublishing(true);
    try {
      await api.post('/api/combos', payload);

      setToast({
        visible: true,
        message: '🎉 Combo deal published! Gemini AI will now recommend this deal to customers.',
        type: 'success',
      });

      // Reset form
      setSelectedMealIds([]);
      setComboName('');
      setComboDescription('');
      setCustomDiscountText('');
      setDiscountPercentage(15);
      setPortionLimit('10');
      setCustomOriginalPrice('');
      setCustomDealPrice('');
      setCustomIncludedItems('');
      setComboImageUrl('');

      fetchData();
    } catch (err: any) {
      console.error('Error creating combo deal:', err);
      const errorData = err.response?.data;
      let errorMsg = 'Failed to create combo deal. Please try again.';
      if (errorData) {
        if (typeof errorData === 'object' && !errorData.message) {
          const fieldErrors = Object.entries(errorData).map(([k, v]) => `${k}: ${v}`).join('\n');
          errorMsg = `Validation errors:\n${fieldErrors}`;
        } else {
          errorMsg = errorData.message || errorMsg;
        }
      }
      Alert.alert('Error', errorMsg);
    } finally {
      setPublishing(false);
    }
  };

  // Delete Combo Deal
  const handleDeleteCombo = (comboId: string, name: string) => {
    Alert.alert(
      'Remove Combo Deal?',
      `Are you sure you want to remove "${name}"? Customers will no longer see this combo.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(comboId);
            try {
              await api.delete(`/api/combos/${comboId}`);
              setToast({ visible: true, message: 'Combo deal removed.', type: 'success' });
              fetchData();
            } catch (err) {
              Alert.alert('Error', 'Failed to remove combo deal.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={S.loadingScreen}>
        <StatusBar barStyle="light-content" backgroundColor={C.dark} />
        <View style={S.loadingBox}>
          <ActivityIndicator size="large" color={C.greenLight} />
          <Text style={S.loadingText}>Syncing culinary bundles...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      {/* ─── Screen Header ─── */}
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
          {/* Top Bar with Back & AI Pill */}
          <View style={S.topBarRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.75}
              style={S.backBtn}
            >
              <Feather name="arrow-left" size={20} color={C.white} />
            </TouchableOpacity>

            <View style={S.aiBadge}>
              <Ionicons name="sparkles" size={13} color="#FBBF24" />
              <Text style={S.aiBadgeText}>GEMINI AI POWERED</Text>
            </View>
          </View>

          {/* Header Title */}
          <Text style={S.heroTitle}>Combo Deals Studio</Text>
          <Text style={S.heroSubtitle}>
            Package dishes into enticing feasts. Our AI engine recommends high-value bundles directly to customers at checkout.
          </Text>

          {/* Telemetry Bar */}
          <View style={S.telemetryBar}>
            <View style={S.telemetryItem}>
              <Text style={S.telemetryVal}>{existingCombos.length}</Text>
              <Text style={S.telemetryLbl}>Active Combos</Text>
            </View>
            <View style={S.telemetrySep} />
            <View style={S.telemetryItem}>
              <Text style={[S.telemetryVal, { color: C.greenLight }]}>{cookMeals.length}</Text>
              <Text style={S.telemetryLbl}>Dishes to Bundle</Text>
            </View>
            <View style={S.telemetrySep} />
            <View style={S.telemetryItem}>
              <Text style={[S.telemetryVal, { color: C.amber }]}>Up to 25%</Text>
              <Text style={S.telemetryLbl}>Diner Savings</Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

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
        {/* ─── Mode Switcher Segmented Control ─── */}
        <View style={S.modeWrap}>
          <TouchableOpacity
            onPress={() => setCreateMode('bundle')}
            activeOpacity={0.85}
            style={[S.modeBtn, createMode === 'bundle' && S.modeBtnActive]}
          >
            {createMode === 'bundle' && (
              <LinearGradient
                colors={[C.greenLight, C.green]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Text style={{ fontSize: 14, marginRight: 6 }}>🥘</Text>
            <Text style={[S.modeBtnText, createMode === 'bundle' && S.modeBtnTextActive]}>
              Bundle Existing Dishes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCreateMode('custom')}
            activeOpacity={0.85}
            style={[S.modeBtn, createMode === 'custom' && S.modeBtnActive]}
          >
            {createMode === 'custom' && (
              <LinearGradient
                colors={[C.greenLight, C.green]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Text style={{ fontSize: 14, marginRight: 6 }}>✨</Text>
            <Text style={[S.modeBtnText, createMode === 'custom' && S.modeBtnTextActive]}>
              New Custom Feast
            </Text>
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* MODE 1: BUNDLE EXISTING DISHES                                  */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {createMode === 'bundle' && (
          <>
            {/* Step 1: Dish Selection Cloud */}
            <View style={S.sectionCard}>
              <View style={S.cardHeaderRow}>
                <View style={[S.stepBadge, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={S.stepBadgeText}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.cardTitle}>Select Dishes to Bundle</Text>
                  <Text style={S.cardSub}>Pick at least 2 dishes to assemble your package</Text>
                </View>
                <View style={[S.selectedCountPill, selectedMealIds.length >= 2 && S.selectedCountPillReady]}>
                  <Text style={[S.selectedCountText, selectedMealIds.length >= 2 && S.selectedCountTextReady]}>
                    {selectedMealIds.length} Selected
                  </Text>
                </View>
              </View>

              {cookMeals.length === 0 ? (
                <View style={S.emptyStateBox}>
                  <Text style={{ fontSize: 36, marginBottom: 8 }}>🍽️</Text>
                  <Text style={S.emptyStateTitle}>No Active Menu Dishes Found</Text>
                  <Text style={S.emptyStateSub}>
                    You can switch to "New Custom Feast" above to create a standalone combo deal!
                  </Text>
                </View>
              ) : (
                <View style={S.dishesList}>
                  {cookMeals.map((meal) => {
                    const isSelected = selectedMealIds.includes(meal.id);
                    return (
                      <TouchableOpacity
                        key={meal.id}
                        onPress={() => toggleMealSelection(meal.id)}
                        activeOpacity={0.82}
                        style={[S.dishRow, isSelected && S.dishRowSelected]}
                      >
                        <View style={[S.checkbox, isSelected && S.checkboxSelected]}>
                          {isSelected && <Ionicons name="checkmark" size={14} color={C.white} />}
                        </View>

                        <View style={S.dishThumbBox}>
                          {meal.photos && meal.photos.length > 0 ? (
                            <Image source={{ uri: meal.photos[0] }} style={S.dishThumb} resizeMode="cover" />
                          ) : (
                            <View style={S.dishThumbPlaceholder}>
                              <Text style={{ fontSize: 16 }}>{CATEGORY_EMOJI[meal.category] || '🍲'}</Text>
                            </View>
                          )}
                        </View>

                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={S.dishName} numberOfLines={1}>
                            {meal.name}
                          </Text>
                          <Text style={S.dishMeta}>
                            {CATEGORY_EMOJI[meal.category] || ''} {meal.category} • {meal.cuisineType || 'Home-style'}
                          </Text>
                        </View>

                        <Text style={S.dishPrice}>LKR {Math.round(meal.price).toLocaleString()}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Step 2: Pricing & Discount Config */}
            {selectedMealIds.length >= 2 && (
              <View style={S.sectionCard}>
                <View style={S.cardHeaderRow}>
                  <View style={[S.stepBadge, { backgroundColor: '#FFFBEB' }]}>
                    <Text style={[S.stepBadgeText, { color: C.amber }]}>2</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.cardTitle}>Bundle Discount & Pricing</Text>
                    <Text style={S.cardSub}>Set discount percentage to attract high-value orders</Text>
                  </View>
                </View>

                {/* Dark Slate Pricing Visualizer */}
                <LinearGradient
                  colors={['#162438', '#0F1923']}
                  style={S.pricingVisualizer}
                >
                  <View style={S.pvRow}>
                    <Text style={S.pvLabel}>Individual Dishes Total:</Text>
                    <Text style={S.pvOriginalVal}>LKR {bundleOriginalTotal.toLocaleString()}</Text>
                  </View>

                  <View style={S.pvRow}>
                    <Text style={[S.pvLabel, { color: C.amber }]}>
                      Bundle Discount ({effectiveDiscount}%):
                    </Text>
                    <Text style={[S.pvDiscountVal, { color: C.amber }]}>
                      − LKR {bundleSavings.toLocaleString()}
                    </Text>
                  </View>

                  <View style={S.pvDivider} />

                  <View style={S.pvTotalRow}>
                    <View>
                      <Text style={S.pvFinalLabel}>Diner Combo Price</Text>
                      <Text style={S.pvFinalSub}>What customer pays</Text>
                    </View>
                    <Text style={S.pvFinalPrice}>LKR {bundleComboPrice.toLocaleString()}</Text>
                  </View>

                  {/* Chef 90% Net Deposit Guarantee */}
                  <View style={S.pvNetDepositBar}>
                    <Feather name="shield" size={13} color={C.greenLight} style={{ marginRight: 6 }} />
                    <Text style={S.pvNetDepositText}>
                      Your Net Deposit (90%): <Text style={{ fontWeight: '900', color: C.greenLight }}>LKR {bundleChefEarnings.toLocaleString()}</Text>
                    </Text>
                  </View>
                </LinearGradient>

                {/* Discount Percentage Preset Pills */}
                <Text style={S.inputLabel}>QUICK DISCOUNT SELECTOR</Text>
                <View style={S.discountPresetsRow}>
                  {DISCOUNT_PRESETS.map((pct) => {
                    const isSel = discountPercentage === pct && !customDiscountText;
                    return (
                      <TouchableOpacity
                        key={pct}
                        onPress={() => {
                          setDiscountPercentage(pct);
                          setCustomDiscountText('');
                        }}
                        style={[S.discountPill, isSel && S.discountPillActive]}
                      >
                        <Text style={[S.discountPillText, isSel && S.discountPillTextActive]}>
                          {pct}% OFF
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={S.inputBox}>
                  <TextInput
                    placeholder="Or enter custom discount percentage (e.g. 18)..."
                    placeholderTextColor={C.text3}
                    value={customDiscountText}
                    onChangeText={setCustomDiscountText}
                    keyboardType="numeric"
                    style={S.textInput}
                  />
                  <Text style={S.inputSuffix}>%</Text>
                </View>
              </View>
            )}

            {/* Step 3: Bundle Details */}
            {selectedMealIds.length >= 2 && (
              <View style={S.sectionCard}>
                <View style={S.cardHeaderRow}>
                  <View style={[S.stepBadge, { backgroundColor: '#EFF6FF' }]}>
                    <Text style={[S.stepBadgeText, { color: C.blue }]}>3</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.cardTitle}>Combo Details & Cover</Text>
                    <Text style={S.cardSub}>Name, culinary highlights, and batch capacity</Text>
                  </View>
                </View>

                {/* Combo Deal Name */}
                <Text style={S.inputLabel}>COMBO DEAL NAME *</Text>
                <View style={S.inputBox}>
                  <TextInput
                    placeholder="e.g. Sunday Rice & Curry Family Feast"
                    placeholderTextColor={C.text3}
                    value={comboName}
                    onChangeText={setComboName}
                    style={S.textInput}
                  />
                </View>

                {/* Description */}
                <Text style={[S.inputLabel, { marginTop: 14 }]}>DESCRIPTION (OPTIONAL)</Text>
                <View style={S.textAreaBox}>
                  <TextInput
                    placeholder="Describe why this bundle is the perfect feast for diners..."
                    placeholderTextColor={C.text3}
                    value={comboDescription}
                    onChangeText={setComboDescription}
                    multiline
                    numberOfLines={3}
                    style={S.textAreaInput}
                  />
                </View>

                {/* Cover Photo */}
                <Text style={[S.inputLabel, { marginTop: 14 }]}>COMBO COVER PHOTO (OPTIONAL)</Text>
                {comboImageUrl ? (
                  <View style={S.photoPreviewBox}>
                    <Image source={{ uri: comboImageUrl }} style={S.photoPreview} resizeMode="cover" />
                    {uploadingImage && (
                      <View style={S.photoUploadingOverlay}>
                        <ActivityIndicator size="large" color={C.white} />
                        <Text style={S.photoUploadingText}>Uploading to CDN...</Text>
                      </View>
                    )}
                    {!uploadingImage && (
                      <View style={S.photoControls}>
                        <TouchableOpacity onPress={handlePickComboImage} style={S.photoCtrlBtn}>
                          <Feather name="refresh-cw" size={13} color={C.white} />
                          <Text style={S.photoCtrlText}>Replace</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setComboImageUrl('')} style={[S.photoCtrlBtn, { backgroundColor: 'rgba(239, 68, 68, 0.85)' }]}>
                          <Feather name="trash-2" size={13} color={C.white} />
                          <Text style={S.photoCtrlText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity onPress={handlePickComboImage} style={S.dropzone} activeOpacity={0.8}>
                    {uploadingImage ? (
                      <View style={{ alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={C.green} />
                        <Text style={S.dropzoneText}>Uploading photo...</Text>
                      </View>
                    ) : (
                      <>
                        <View style={S.dropzoneIcon}>
                          <Feather name="image" size={20} color={C.green} />
                        </View>
                        <Text style={S.dropzoneTitle}>Upload Custom Combo Photo</Text>
                        <Text style={S.dropzoneSub}>Or we will auto-collage your selected dishes</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* Daily Portions */}
                <Text style={[S.inputLabel, { marginTop: 14 }]}>DAILY AVAILABLE PORTIONS *</Text>
                <View style={S.inputBox}>
                  <TextInput
                    placeholder="10"
                    placeholderTextColor={C.text3}
                    value={portionLimit}
                    onChangeText={setPortionLimit}
                    keyboardType="numeric"
                    style={S.textInput}
                  />
                  <Text style={S.inputSuffix}>bundles / day</Text>
                </View>

                {/* Publish CTA Button */}
                <TouchableOpacity
                  onPress={handlePublishCombo}
                  disabled={publishing}
                  activeOpacity={0.88}
                  style={S.publishBtn}
                >
                  <LinearGradient
                    colors={[C.greenLight, C.green]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={S.publishGradient}
                  >
                    {publishing ? (
                      <ActivityIndicator size="small" color={C.white} />
                    ) : (
                      <>
                        <Text style={{ fontSize: 18, marginRight: 8 }}>🚀</Text>
                        <Text style={S.publishBtnText}>PUBLISH COMBO DEAL</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* MODE 2: CREATE CUSTOM COMBO FROM SCRATCH                        */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {createMode === 'custom' && (
          <View style={S.sectionCard}>
            <View style={S.cardHeaderRow}>
              <View style={[S.stepBadge, { backgroundColor: '#F3E8FF' }]}>
                <Text style={[S.stepBadgeText, { color: C.purple }]}>✨</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.cardTitle}>Custom Combo From Scratch</Text>
                <Text style={S.cardSub}>Create a brand-new signature meal deal package</Text>
              </View>
            </View>

            {/* Deal Title */}
            <Text style={S.inputLabel}>COMBO DEAL TITLE *</Text>
            <View style={S.inputBox}>
              <TextInput
                placeholder="e.g. Royal Chicken Biryani & Dessert Feast"
                placeholderTextColor={C.text3}
                value={comboName}
                onChangeText={setComboName}
                style={S.textInput}
              />
            </View>

            {/* Included Items */}
            <Text style={[S.inputLabel, { marginTop: 14 }]}>INCLUDED DISHES & ITEMS *</Text>
            <View style={S.inputBox}>
              <TextInput
                placeholder="e.g. Chicken Dum Biryani, Boiled Egg, Raita, Gulab Jamun"
                placeholderTextColor={C.text3}
                value={customIncludedItems}
                onChangeText={setCustomIncludedItems}
                style={S.textInput}
              />
            </View>
            <Text style={S.helperText}>List all items included in this special combo</Text>

            {/* Cuisine Selector */}
            <Text style={[S.inputLabel, { marginTop: 14 }]}>CUISINE CATEGORY *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {CUISINES.map((cuisine) => {
                const isSel = customCuisine === cuisine;
                return (
                  <TouchableOpacity
                    key={cuisine}
                    onPress={() => setCustomCuisine(cuisine)}
                    style={[S.cuisineChip, isSel && S.cuisineChipActive]}
                  >
                    <Text style={[S.cuisineChipText, isSel && S.cuisineChipTextActive]}>
                      {cuisine}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Description */}
            <Text style={S.inputLabel}>DESCRIPTION (OPTIONAL)</Text>
            <View style={S.textAreaBox}>
              <TextInput
                placeholder="Describe flavors, portions, and freshness..."
                placeholderTextColor={C.text3}
                value={comboDescription}
                onChangeText={setComboDescription}
                multiline
                numberOfLines={3}
                style={S.textAreaInput}
              />
            </View>

            {/* Pricing Section */}
            <View style={S.pricingRow}>
              <View style={{ flex: 1 }}>
                <Text style={S.inputLabel}>REGULAR VALUE (LKR)</Text>
                <View style={S.inputBox}>
                  <TextInput
                    placeholder="e.g. 2200"
                    placeholderTextColor={C.text3}
                    value={customOriginalPrice}
                    onChangeText={setCustomOriginalPrice}
                    keyboardType="numeric"
                    style={S.textInput}
                  />
                </View>
              </View>

              <View style={{ width: 12 }} />

              <View style={{ flex: 1 }}>
                <Text style={S.inputLabel}>COMBO PRICE (LKR) *</Text>
                <View style={S.inputBox}>
                  <TextInput
                    placeholder="e.g. 1750"
                    placeholderTextColor={C.text3}
                    value={customDealPrice}
                    onChangeText={setCustomDealPrice}
                    keyboardType="numeric"
                    style={S.textInput}
                  />
                </View>
              </View>
            </View>

            {/* Savings & 90% Take-home banner */}
            {dealPriceNum > 0 && (
              <LinearGradient
                colors={['#ECFDF5', '#E6F4EA']}
                style={S.savingsBanner}
              >
                <View style={S.savingsRow}>
                  <View>
                    <Text style={S.savingsLabel}>Customer Savings</Text>
                    <Text style={S.savingsVal}>
                      {origPriceNum > dealPriceNum
                        ? `Save LKR ${origPriceNum - dealPriceNum} (${Math.round(((origPriceNum - dealPriceNum) / origPriceNum) * 100)}% OFF)`
                        : 'Special Combo Price'}
                    </Text>
                  </View>
                  <View style={S.earningsBox}>
                    <Text style={S.earningsLabel}>Your 90% Deposit</Text>
                    <Text style={S.earningsVal}>LKR {customChefEarnings.toLocaleString()}</Text>
                  </View>
                </View>
              </LinearGradient>
            )}

            {/* Cover Photo */}
            <Text style={[S.inputLabel, { marginTop: 14 }]}>COMBO PHOTO (OPTIONAL)</Text>
            {comboImageUrl ? (
              <View style={S.photoPreviewBox}>
                <Image source={{ uri: comboImageUrl }} style={S.photoPreview} resizeMode="cover" />
                {uploadingImage && (
                  <View style={S.photoUploadingOverlay}>
                    <ActivityIndicator size="large" color={C.white} />
                    <Text style={S.photoUploadingText}>Uploading photo...</Text>
                  </View>
                )}
                {!uploadingImage && (
                  <View style={S.photoControls}>
                    <TouchableOpacity onPress={handlePickComboImage} style={S.photoCtrlBtn}>
                      <Feather name="refresh-cw" size={13} color={C.white} />
                      <Text style={S.photoCtrlText}>Replace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setComboImageUrl('')} style={[S.photoCtrlBtn, { backgroundColor: 'rgba(239, 68, 68, 0.85)' }]}>
                      <Feather name="trash-2" size={13} color={C.white} />
                      <Text style={S.photoCtrlText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity onPress={handlePickComboImage} style={S.dropzone} activeOpacity={0.8}>
                {uploadingImage ? (
                  <View style={{ alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={C.green} />
                    <Text style={S.dropzoneText}>Uploading...</Text>
                  </View>
                ) : (
                  <>
                    <View style={S.dropzoneIcon}>
                      <Feather name="image" size={20} color={C.green} />
                    </View>
                    <Text style={S.dropzoneTitle}>Select Combo Feast Photo</Text>
                    <Text style={S.dropzoneSub}>From your device • Max 5 MB</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Available Portions */}
            <Text style={[S.inputLabel, { marginTop: 14 }]}>DAILY AVAILABLE PORTIONS *</Text>
            <View style={S.inputBox}>
              <TextInput
                placeholder="10"
                placeholderTextColor={C.text3}
                value={portionLimit}
                onChangeText={setPortionLimit}
                keyboardType="numeric"
                style={S.textInput}
              />
              <Text style={S.inputSuffix}>bundles / day</Text>
            </View>

            {/* Publish CTA Button */}
            <TouchableOpacity
              onPress={handlePublishCombo}
              disabled={publishing}
              activeOpacity={0.88}
              style={S.publishBtn}
            >
              <LinearGradient
                colors={[C.greenLight, C.green]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={S.publishGradient}
              >
                {publishing ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <>
                    <Text style={{ fontSize: 18, marginRight: 8 }}>🚀</Text>
                    <Text style={S.publishBtnText}>PUBLISH CUSTOM COMBO DEAL</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* ACTIVE COMBOS SHOWCASE SECTION                                  */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <View style={S.activeSection}>
          <View style={S.activeHeaderRow}>
            <View>
              <Text style={S.activeTitle}>My Active Combo Deals</Text>
              <Text style={S.activeSub}>Bundles currently live and recommended to customers</Text>
            </View>
            <View style={S.activeCountBadge}>
              <Text style={S.activeCountText}>{existingCombos.length} Live</Text>
            </View>
          </View>

          {existingCombos.length === 0 ? (
            <View style={S.emptyCombosCard}>
              <View style={S.emptyCombosIconBox}>
                <Text style={{ fontSize: 40 }}>🎁</Text>
              </View>
              <Text style={S.emptyCombosTitle}>No Active Combo Deals Yet</Text>
              <Text style={S.emptyCombosSub}>
                Bundle dishes or launch a signature feast above to activate automated Gemini AI meal recommendations.
              </Text>
            </View>
          ) : (
            <View style={S.combosList}>
              {existingCombos.map((combo) => (
                <View key={combo.id} style={S.comboCard}>
                  {/* Photo or Header Banner */}
                  {combo.photos && combo.photos.length > 0 ? (
                    <View style={S.comboPhotoBox}>
                      <Image source={{ uri: combo.photos[0] }} style={S.comboPhoto} resizeMode="cover" />
                      <View style={S.discountTag}>
                        <Text style={S.discountTagText}>🔥 {combo.discountPercentage}% SAVINGS</Text>
                      </View>
                      <View style={S.portionsLeftTag}>
                        <Text style={S.portionsLeftText}>🍱 {combo.portionsRemaining} portions left</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={S.comboNoPhotoBanner}>
                      <View style={S.discountTag}>
                        <Text style={S.discountTagText}>🔥 {combo.discountPercentage}% SAVINGS</Text>
                      </View>
                      <View style={S.portionsLeftTag}>
                        <Text style={S.portionsLeftText}>🍱 {combo.portionsRemaining} portions left</Text>
                      </View>
                    </View>
                  )}

                  {/* Combo Body */}
                  <View style={S.comboCardBody}>
                    <View style={S.comboHeaderRow}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={S.comboCardName} numberOfLines={1}>
                          {combo.name}
                        </Text>
                        <Text style={S.comboCardDesc} numberOfLines={2}>
                          {combo.description}
                        </Text>
                      </View>

                      {/* Delete Button */}
                      <TouchableOpacity
                        onPress={() => handleDeleteCombo(combo.id, combo.name)}
                        disabled={deletingId === combo.id}
                        style={S.deleteBtn}
                        accessibilityLabel="Delete Combo"
                      >
                        {deletingId === combo.id ? (
                          <ActivityIndicator size="small" color={C.red} />
                        ) : (
                          <Feather name="trash-2" size={16} color={C.red} />
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Bottom Pricing & Status Strip */}
                    <View style={S.comboFooterStrip}>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                          <Text style={S.comboPrice}>LKR {Math.round(combo.price).toLocaleString()}</Text>
                          {combo.originalTotalPrice > combo.price && (
                            <Text style={S.comboOrigPrice}>
                              LKR {Math.round(combo.originalTotalPrice).toLocaleString()}
                            </Text>
                          )}
                        </View>
                        <Text style={S.comboCuisineText}>{combo.cuisineType || 'Home-style Special'}</Text>
                      </View>

                      <View style={S.activeBadge}>
                        <View style={S.activeDot} />
                        <Text style={S.activeBadgeText}>ACTIVE DEAL</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
};

// ─── Stylesheet ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.surface,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.surface,
  },
  loadingBox: {
    backgroundColor: C.white,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingText: {
    color: C.text2,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
  },

  // Hero Section
  hero: {
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingHorizontal: 20,
    paddingBottom: 24,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  aiBadgeText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: C.white,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  heroSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 16,
  },

  // Telemetry Bar
  telemetryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 36, 56, 0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.darkBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  telemetryItem: {
    flex: 1,
    alignItems: 'center',
  },
  telemetryVal: {
    color: C.white,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  telemetryLbl: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  telemetrySep: {
    width: 1,
    height: 24,
    backgroundColor: C.darkBorder,
  },

  // Scroll Body
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Mode Switcher
  modeWrap: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 18,
    padding: 4,
    marginBottom: 18,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },
  modeBtnActive: {},
  modeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.text2,
  },
  modeBtnTextActive: {
    color: C.white,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8EEF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: C.green,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: C.text1,
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 11,
    color: C.text3,
    fontWeight: '500',
    marginTop: 1,
  },
  selectedCountPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  selectedCountPillReady: {
    backgroundColor: '#ECFDF5',
  },
  selectedCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.text2,
  },
  selectedCountTextReady: {
    color: C.green,
  },

  // Empty State in Card
  emptyStateBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.text1,
    marginBottom: 4,
  },
  emptyStateSub: {
    fontSize: 11,
    color: C.text3,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  // Dishes List
  dishesList: {
    gap: 8,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dishRowSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: C.green,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: C.white,
  },
  checkboxSelected: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  dishThumbBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    marginRight: 10,
  },
  dishThumb: {
    width: '100%',
    height: '100%',
  },
  dishThumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishName: {
    fontSize: 13,
    fontWeight: '800',
    color: C.text1,
  },
  dishMeta: {
    fontSize: 10,
    color: C.text3,
    fontWeight: '600',
    marginTop: 2,
  },
  dishPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: C.green,
  },

  // Pricing Visualizer
  pricingVisualizer: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  pvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pvLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  pvOriginalVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  pvDiscountVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  pvDivider: {
    height: 1,
    backgroundColor: '#1E324D',
    marginVertical: 8,
  },
  pvTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pvFinalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: C.white,
  },
  pvFinalSub: {
    fontSize: 10,
    color: '#94A3B8',
  },
  pvFinalPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: C.greenLight,
    letterSpacing: -0.3,
  },
  pvNetDepositBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(82, 183, 136, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(82, 183, 136, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pvNetDepositText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },

  // Discount Presets
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.text2,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  discountPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  discountPill: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    alignItems: 'center',
  },
  discountPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: C.green,
  },
  discountPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.text1,
  },
  discountPillTextActive: {
    color: C.green,
  },

  // Input Box
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: C.text1,
    padding: 0,
  },
  inputSuffix: {
    fontSize: 11,
    fontWeight: '800',
    color: C.text3,
    marginLeft: 6,
  },
  textAreaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textAreaInput: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text1,
    minHeight: 60,
    textAlignVertical: 'top',
    padding: 0,
  },
  helperText: {
    fontSize: 10,
    color: C.text3,
    marginTop: 4,
    marginLeft: 2,
  },

  // Cuisine Chip
  cuisineChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  cuisineChipActive: {
    backgroundColor: C.green,
  },
  cuisineChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.text2,
  },
  cuisineChipTextActive: {
    color: C.white,
  },

  // Pricing Row in Mode 2
  pricingRow: {
    flexDirection: 'row',
    marginTop: 14,
    marginBottom: 12,
  },
  savingsBanner: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(45, 106, 79, 0.2)',
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savingsLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.text2,
  },
  savingsVal: {
    fontSize: 12,
    fontWeight: '800',
    color: C.green,
    marginTop: 2,
  },
  earningsBox: {
    alignItems: 'flex-end',
  },
  earningsLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: C.text2,
  },
  earningsVal: {
    fontSize: 13,
    fontWeight: '900',
    color: C.green,
    marginTop: 1,
  },

  // Cover Photo
  dropzone: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    paddingVertical: 20,
    alignItems: 'center',
  },
  dropzoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dropzoneTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: C.text1,
  },
  dropzoneSub: {
    fontSize: 10,
    color: C.text3,
    marginTop: 2,
  },
  dropzoneText: {
    fontSize: 11,
    color: C.text2,
    fontWeight: '600',
    marginTop: 6,
  },
  photoPreviewBox: {
    height: 160,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F1923',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 25, 35, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploadingText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  photoControls: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  photoCtrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 25, 35, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  photoCtrlText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '800',
  },

  // Publish CTA
  publishBtn: {
    marginTop: 18,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  publishGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  publishBtnText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Active Combos Section
  activeSection: {
    marginTop: 6,
  },
  activeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  activeTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: C.text1,
    letterSpacing: -0.2,
  },
  activeSub: {
    fontSize: 11,
    color: C.text3,
    fontWeight: '500',
    marginTop: 2,
  },
  activeCountBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(45, 106, 79, 0.2)',
  },
  activeCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.green,
  },
  emptyCombosCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EEF5',
  },
  emptyCombosIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyCombosTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: C.text1,
    marginBottom: 4,
  },
  emptyCombosSub: {
    fontSize: 11,
    color: C.text3,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 12,
  },
  combosList: {
    gap: 14,
  },
  comboCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EEF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  comboPhotoBox: {
    height: 130,
    backgroundColor: '#0F1923',
    position: 'relative',
  },
  comboPhoto: {
    width: '100%',
    height: '100%',
  },
  comboNoPhotoBanner: {
    height: 48,
    backgroundColor: '#162438',
    position: 'relative',
  },
  discountTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountTagText: {
    color: C.white,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  portionsLeftTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(15, 25, 35, 0.85)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  portionsLeftText: {
    color: '#E2E8F0',
    fontSize: 9,
    fontWeight: '800',
  },
  comboCardBody: {
    padding: 14,
  },
  comboHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  comboCardName: {
    fontSize: 15,
    fontWeight: '900',
    color: C.text1,
    letterSpacing: -0.2,
  },
  comboCardDesc: {
    fontSize: 11,
    color: C.text2,
    lineHeight: 16,
    marginTop: 2,
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comboFooterStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  comboPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: C.green,
  },
  comboOrigPrice: {
    fontSize: 11,
    fontWeight: '600',
    color: C.text3,
    textDecorationLine: 'line-through',
  },
  comboCuisineText: {
    fontSize: 9,
    fontWeight: '700',
    color: C.text3,
    marginTop: 1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
  },
});
