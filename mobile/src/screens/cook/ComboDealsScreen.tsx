import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Toast } from '../../components/common/Toast';
import { SectionHeader } from '../../components/common/SectionHeader';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import {
  requestGalleryPermission,
  pickImageFromGallery,
  uploadImageToImgBB,
  validateImageSize,
} from '../../services/imageService';

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
  LUNCH: '🍛',
  DINNER: '🍜',
  SNACKS: '🍩',
  COMBO: '🎁',
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

  // Shared image state (gallery-picked & uploaded to ImgBB)
  const [comboImageUrl, setComboImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  // ─── Gallery Image Picker ───
  const handlePickComboImage = async () => {
    try {
      const hasPermission = await requestGalleryPermission();
      if (!hasPermission) {
        setToast({ visible: true, message: 'Gallery permission is required to upload photos.', type: 'error' });
        return;
      }

      const asset = await pickImageFromGallery();
      if (!asset) return; // User cancelled

      // Validate: must be < 5 MB
      await validateImageSize(asset);

      // Show local preview immediately
      setComboImageUrl(asset.uri);
      setUploadingImage(true);

      // Upload to ImgBB CDN
      const cdnUrl = await uploadImageToImgBB(asset.uri);
      setComboImageUrl(cdnUrl);
      setToast({ visible: true, message: '📸 Combo photo uploaded!', type: 'success' });
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
      // 1. Fetch cook's meals
      const mealsRes = await api.get(`/api/meals/cook/${user.id}`);
      const nonCombos = (mealsRes.data || []).filter((m: any) => !m.combo && m.category !== 'COMBO');
      setCookMeals(nonCombos);

      // 2. Fetch cook's combos
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

  // Calculation for Mode 1 (Bundle)
  const selectedMeals = cookMeals.filter((m) => selectedMealIds.includes(m.id));
  const bundleOriginalTotal = selectedMeals.reduce((sum, m) => sum + m.price, 0);
  const effectiveDiscount = customDiscountText ? (parseFloat(customDiscountText) || 0) : discountPercentage;
  const bundleComboPrice = Math.round(bundleOriginalTotal * (1 - effectiveDiscount / 100));
  const bundleSavings = Math.max(0, bundleOriginalTotal - bundleComboPrice);

  // Calculation for Mode 2 (Custom Standalone)
  const origPriceNum = parseFloat(customOriginalPrice) || 0;
  const dealPriceNum = parseFloat(customDealPrice) || 0;
  const customCalculatedSavings = Math.max(0, origPriceNum - dealPriceNum);
  const customDiscountPercent = origPriceNum > 0 && dealPriceNum > 0
    ? Math.round(((origPriceNum - dealPriceNum) / origPriceNum) * 100)
    : effectiveDiscount;

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
      // Use cook-uploaded image if provided, otherwise fall back to meal photos
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
      // Mode 2: Brand new standalone custom combo
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
        message: '🎉 Combo deal published! Customers will now receive AI recommendations for it.',
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
      // Log the full response body to see which fields failed validation
      if (err.response?.data) {
        console.error('Backend validation errors:', JSON.stringify(err.response.data, null, 2));
      }
      const errorData = err.response?.data;
      let errorMsg = 'Failed to create combo deal. Please try again.';
      if (errorData) {
        if (typeof errorData === 'object' && !errorData.message) {
          // Validation field errors map
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
      <View className="flex-1 justify-center items-center bg-[#F8F9FA]">
        <ActivityIndicator size="large" color="#2D6A4F" />
        <Text className="text-gray-500 font-semibold text-xs mt-3">Loading kitchen deals...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F8F9FA]">
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-6 pt-12 pb-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#1F2937" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-gray-900 font-black text-lg">Create Combo Deals</Text>
            <Text className="text-gray-500 text-[10px]">Bundle dishes or create standalone meal deals</Text>
          </View>
          <View className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex-row items-center">
            <Ionicons name="sparkles" size={12} color="#059669" />
            <Text className="text-emerald-700 font-black text-[10px] ml-1">AI Enabled</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D6A4F" />}
      >
        {/* Info Banner */}
        <View className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-5 mb-5 shadow-md relative overflow-hidden bg-[#1E3A2F]">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <View className="bg-emerald-400/20 px-2.5 py-0.5 rounded-md self-start mb-2 border border-emerald-300/30">
                <Text className="text-emerald-200 text-[9px] font-black tracking-wider uppercase">
                  Cook Smart Tool
                </Text>
              </View>
              <Text className="text-white font-extrabold text-base mb-1">
                Bundle Dishes or Create New Combos
              </Text>
              <Text className="text-white/70 text-xs leading-4">
                Offer special meal bundles to boost order sizes. NeighborPlates' Gemini AI will match & recommend your combo to customers looking for deals!
              </Text>
            </View>
            <View className="w-12 h-12 rounded-2xl bg-white/15 items-center justify-center">
              <Text className="text-2xl">🎁</Text>
            </View>
          </View>
        </View>

        {/* ─── CREATION MODE TOGGLE TABS ─── */}
        <View className="flex-row bg-gray-200 p-1 rounded-2xl mb-6">
          <TouchableOpacity
            onPress={() => setCreateMode('bundle')}
            className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-1.5 ${
              createMode === 'bundle' ? 'bg-white shadow-sm' : ''
            }`}
            activeOpacity={0.8}
          >
            <Text className="text-sm">🥘</Text>
            <Text
              className={`font-black text-xs ${
                createMode === 'bundle' ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              Bundle Existing Dishes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCreateMode('custom')}
            className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-1.5 ${
              createMode === 'custom' ? 'bg-white shadow-sm' : ''
            }`}
            activeOpacity={0.8}
          >
            <Text className="text-sm">✨</Text>
            <Text
              className={`font-black text-xs ${
                createMode === 'custom' ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              New Custom Combo
            </Text>
          </TouchableOpacity>
        </View>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODE 1: BUNDLE EXISTING DISHES                                 */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {createMode === 'bundle' && (
          <>
            {/* STEP 1: Select Dishes */}
            <View className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm mb-6">
              <View className="flex-row justify-between items-center mb-3">
                <SectionHeader title="1. Select Meals to Bundle" icon="🥘" />
                <Badge
                  label={`${selectedMealIds.length} Selected`}
                  variant={selectedMealIds.length >= 2 ? 'success' : 'neutral'}
                />
              </View>

              {cookMeals.length === 0 ? (
                <View className="py-6 items-center">
                  <Text className="text-3xl mb-2">🍽️</Text>
                  <Text className="text-gray-700 font-bold text-xs text-center">No Active Meals Found</Text>
                  <Text className="text-gray-400 text-[11px] text-center mt-1">
                    You can switch to "New Custom Combo" above to create a combo from scratch!
                  </Text>
                </View>
              ) : (
                <View className="gap-2.5">
                  {cookMeals.map((meal) => {
                    const isSelected = selectedMealIds.includes(meal.id);
                    return (
                      <TouchableOpacity
                        key={meal.id}
                        onPress={() => toggleMealSelection(meal.id)}
                        activeOpacity={0.8}
                        className={`flex-row items-center p-3 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <View
                          className={`w-6 h-6 rounded-lg items-center justify-center mr-3 border ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                        </View>

                        <View className="w-12 h-12 rounded-xl bg-gray-200 overflow-hidden mr-3">
                          {meal.photos && meal.photos.length > 0 ? (
                            <Image source={{ uri: meal.photos[0] }} className="w-full h-full object-cover" />
                          ) : (
                            <View className="w-full h-full items-center justify-center">
                              <Text className="text-lg">{CATEGORY_EMOJI[meal.category] || '🍲'}</Text>
                            </View>
                          )}
                        </View>

                        <View className="flex-1">
                          <Text className="text-gray-900 font-bold text-xs" numberOfLines={1}>
                            {meal.name}
                          </Text>
                          <Text className="text-gray-500 text-[10px]">
                            {CATEGORY_EMOJI[meal.category] || ''} {meal.category} • {meal.cuisineType || 'Home-style'}
                          </Text>
                        </View>

                        <Text className="text-emerald-700 font-black text-xs">
                          LKR {Math.round(meal.price)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* STEP 2: Pricing & Discount Config */}
            {selectedMealIds.length >= 2 && (
              <View className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm mb-6">
                <SectionHeader title="2. Bundle Discount & Pricing" icon="💰" />

                <View className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-4 mb-4 shadow-sm bg-[#1E293B]">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-gray-300 text-xs font-semibold">Individual Items Total:</Text>
                    <Text className="text-gray-300 font-bold text-xs">LKR {bundleOriginalTotal}</Text>
                  </View>

                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-amber-400 text-xs font-semibold">
                      Applied Discount ({effectiveDiscount}%):
                    </Text>
                    <Text className="text-amber-400 font-bold text-xs">- LKR {bundleSavings}</Text>
                  </View>

                  <View className="h-px bg-gray-700 my-2" />

                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-emerald-400 font-black text-sm">Customer Combo Price:</Text>
                      <Text className="text-gray-400 text-[10px]">What customer pays</Text>
                    </View>
                    <Text className="text-emerald-400 font-black text-xl">
                      LKR {bundleComboPrice}
                    </Text>
                  </View>
                </View>

                <Text className="text-gray-700 font-bold text-xs mb-2">Discount Percentage:</Text>
                <View className="flex-row items-center gap-2 mb-3">
                  {DISCOUNT_PRESETS.map((pct) => (
                    <TouchableOpacity
                      key={pct}
                      onPress={() => {
                        setDiscountPercentage(pct);
                        setCustomDiscountText('');
                      }}
                      className={`flex-1 py-2.5 rounded-xl items-center border ${
                        discountPercentage === pct && !customDiscountText
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <Text
                        className={`font-black text-xs ${
                          discountPercentage === pct && !customDiscountText ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {pct}% OFF
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  label="Custom Discount (%)"
                  placeholder="e.g. 18"
                  value={customDiscountText}
                  onChangeText={setCustomDiscountText}
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* STEP 3: Details */}
            {selectedMealIds.length >= 2 && (
              <View className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm mb-6">
                <SectionHeader title="3. Combo Deal Details" icon="📝" />

                <TextInput
                  label="Combo Deal Name *"
                  placeholder="e.g. Sunday Rice & Curry Family Bundle"
                  value={comboName}
                  onChangeText={setComboName}
                />

                <View className="h-3" />

                <TextInput
                  label="Description (Optional)"
                  placeholder="Tell customers why this combo is special..."
                  value={comboDescription}
                  onChangeText={setComboDescription}
                  multiline
                  numberOfLines={3}
                />

                <View className="h-3" />

                {/* ─── Bundle Image Picker ─── */}
              <View className="mt-1">
                <Text className="text-gray-700 font-bold text-xs mb-2">Combo Cover Photo (Optional, max 5 MB)</Text>
                {comboImageUrl ? (
                  <View className="mb-4">
                    <View className="w-full h-36 rounded-2xl overflow-hidden bg-gray-100 mb-2">
                      {uploadingImage ? (
                        <View className="flex-1 items-center justify-center">
                          <ActivityIndicator size="large" color="#059669" />
                          <Text className="text-gray-500 text-[11px] mt-2">Uploading...</Text>
                        </View>
                      ) : (
                        <Image source={{ uri: comboImageUrl }} className="w-full h-full" resizeMode="cover" />
                      )}
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={handlePickComboImage}
                        className="flex-1 flex-row items-center justify-center py-2.5 bg-emerald-50 border border-emerald-300 rounded-xl"
                        activeOpacity={0.8}
                        disabled={uploadingImage}
                      >
                        <Ionicons name="swap-horizontal" size={14} color="#059669" />
                        <Text className="text-emerald-700 font-bold text-xs ml-1.5">Change Photo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setComboImageUrl('')}
                        className="flex-row items-center justify-center px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl"
                        activeOpacity={0.8}
                        disabled={uploadingImage}
                      >
                        <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handlePickComboImage}
                    disabled={uploadingImage}
                    className="w-full h-28 rounded-2xl border-2 border-dashed border-gray-300 items-center justify-center mb-4 bg-gray-50"
                    activeOpacity={0.8}
                  >
                    {uploadingImage ? (
                      <>
                        <ActivityIndicator size="large" color="#059669" />
                        <Text className="text-gray-500 text-[11px] mt-2">Uploading image...</Text>
                      </>
                    ) : (
                      <>
                        <View className="w-10 h-10 rounded-2xl bg-emerald-100 items-center justify-center mb-1.5">
                          <Ionicons name="image-outline" size={20} color="#059669" />
                        </View>
                        <Text className="text-gray-700 font-bold text-xs">Add Cover Photo (Optional)</Text>
                        <Text className="text-gray-400 text-[10px] mt-0.5">From gallery • Max 5 MB</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                  label="Available Daily Portions *"
                  placeholder="10"
                  value={portionLimit}
                  onChangeText={setPortionLimit}
                  keyboardType="numeric"
                />

                <View className="mt-5">
                  <Button
                    title={publishing ? 'Publishing Deal...' : '🚀 Publish Combo Deal'}
                    onPress={handlePublishCombo}
                    loading={publishing}
                    disabled={publishing}
                    variant="primary"
                  />
                </View>
              </View>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODE 2: CREATE NEW CUSTOM COMBO FROM SCRATCH                   */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {createMode === 'custom' && (
          <View className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm mb-6">
            <SectionHeader title="Create Custom Combo From Scratch" icon="✨" />

            <TextInput
              label="Combo Deal Name *"
              placeholder="e.g. Royal Chicken Biryani Feast"
              value={comboName}
              onChangeText={setComboName}
            />

            <View className="h-3" />

            <TextInput
              label="Included Dishes & Items in Package *"
              placeholder="e.g. Chicken Dum Biryani, Boiled Egg, Cucumber Raita, Gulab Jamun"
              value={customIncludedItems}
              onChangeText={setCustomIncludedItems}
            />

            <View className="h-3" />

            <TextInput
              label="Description (Optional)"
              placeholder="Describe the flavors, portions, and why customers will love this combo..."
              value={comboDescription}
              onChangeText={setComboDescription}
              multiline
              numberOfLines={3}
            />

            <View className="h-4" />

            {/* Cuisine Selector */}
            <Text className="text-gray-700 font-bold text-xs mb-2">Cuisine Type *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {CUISINES.map((cuisine) => (
                <TouchableOpacity
                  key={cuisine}
                  onPress={() => setCustomCuisine(cuisine)}
                  className={`mr-2 px-3.5 py-2 rounded-xl border ${
                    customCuisine === cuisine
                      ? 'bg-emerald-600 border-emerald-600'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      customCuisine === cuisine ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {cuisine}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Pricing Section */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <TextInput
                  label="Original Total (LKR)"
                  placeholder="e.g. 2000"
                  value={customOriginalPrice}
                  onChangeText={setCustomOriginalPrice}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <TextInput
                  label="Combo Price (LKR) *"
                  placeholder="e.g. 1600"
                  value={customDealPrice}
                  onChangeText={setCustomDealPrice}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Live Pricing Summary Banner */}
            {dealPriceNum > 0 && (
              <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 mb-4 flex-row items-center justify-between">
                <View>
                  <Text className="text-emerald-900 font-bold text-xs">Customer Savings</Text>
                  <Text className="text-emerald-700 text-[11px]">
                    {origPriceNum > dealPriceNum
                      ? `Save LKR ${origPriceNum - dealPriceNum} (${Math.round(((origPriceNum - dealPriceNum) / origPriceNum) * 100)}% OFF)`
                      : 'Special bundled price'}
                  </Text>
                </View>
                <Badge label="Deal Active" variant="success" />
              </View>
            )}

            {/* ─── Image Picker ─── */}
            <Text className="text-gray-700 font-bold text-xs mb-2">Combo Photo (Optional, max 5 MB)</Text>
            {comboImageUrl ? (
              <View className="mb-4">
                <View className="w-full h-40 rounded-2xl overflow-hidden bg-gray-100 mb-2">
                  {uploadingImage ? (
                    <View className="flex-1 items-center justify-center">
                      <ActivityIndicator size="large" color="#059669" />
                      <Text className="text-gray-500 text-[11px] mt-2">Uploading...</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: comboImageUrl }} className="w-full h-full" resizeMode="cover" />
                  )}
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={handlePickComboImage}
                    className="flex-1 flex-row items-center justify-center py-2.5 bg-emerald-50 border border-emerald-300 rounded-xl"
                    activeOpacity={0.8}
                    disabled={uploadingImage}
                  >
                    <Ionicons name="swap-horizontal" size={14} color="#059669" />
                    <Text className="text-emerald-700 font-bold text-xs ml-1.5">Change Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setComboImageUrl('')}
                    className="flex-row items-center justify-center px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl"
                    activeOpacity={0.8}
                    disabled={uploadingImage}
                  >
                    <Ionicons name="trash-outline" size={14} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickComboImage}
                disabled={uploadingImage}
                className="w-full h-32 rounded-2xl border-2 border-dashed border-gray-300 items-center justify-center mb-4 bg-gray-50"
                activeOpacity={0.8}
              >
                {uploadingImage ? (
                  <>
                    <ActivityIndicator size="large" color="#059669" />
                    <Text className="text-gray-500 text-[11px] mt-2">Uploading image...</Text>
                  </>
                ) : (
                  <>
                    <View className="w-12 h-12 rounded-2xl bg-emerald-100 items-center justify-center mb-2">
                      <Ionicons name="image-outline" size={24} color="#059669" />
                    </View>
                    <Text className="text-gray-700 font-bold text-xs">Tap to Select Photo</Text>
                    <Text className="text-gray-400 text-[10px] mt-0.5">From your gallery • Max 5 MB</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <View className="h-3" />

            <TextInput
              label="Daily Available Portions *"
              placeholder="10"
              value={portionLimit}
              onChangeText={setPortionLimit}
              keyboardType="numeric"
            />

            <View className="mt-5">
              <Button
                title={publishing ? 'Publishing Deal...' : '🚀 Publish Custom Combo Deal'}
                onPress={handlePublishCombo}
                loading={publishing}
                disabled={publishing}
                variant="primary"
              />
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ACTIVE COMBOS LIST                                              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <View className="mb-10">
          <View className="flex-row justify-between items-center mb-3">
            <SectionHeader title="My Active Combo Deals" icon="📦" />
            <Text className="text-gray-500 font-bold text-xs">{existingCombos.length} Total</Text>
          </View>

          {existingCombos.length === 0 ? (
            <View className="bg-white p-6 rounded-3xl border border-gray-150 items-center">
              <Text className="text-3xl mb-2">🎁</Text>
              <Text className="text-gray-700 font-bold text-xs text-center">No Active Combos</Text>
              <Text className="text-gray-400 text-[11px] text-center mt-1">
                Choose a mode above and publish your first combo deal package.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {existingCombos.map((combo) => (
                <View
                  key={combo.id}
                  className="bg-white rounded-3xl border border-gray-150 p-4 shadow-sm"
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 pr-2">
                      <Text className="text-gray-900 font-extrabold text-sm">{combo.name}</Text>
                      <Text className="text-gray-500 text-[11px] mt-0.5" numberOfLines={2}>
                        {combo.description}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteCombo(combo.id, combo.name)}
                      disabled={deletingId === combo.id}
                      className="p-2 bg-red-50 rounded-xl"
                    >
                      {deletingId === combo.id ? (
                        <ActivityIndicator size="small" color="#DC2626" />
                      ) : (
                        <Feather name="trash-2" size={16} color="#DC2626" />
                      )}
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row items-center justify-between bg-gray-50 p-3 rounded-2xl mt-2">
                    <View>
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-emerald-700 font-black text-sm">
                          LKR {Math.round(combo.price)}
                        </Text>
                        {combo.originalTotalPrice > combo.price && (
                          <Text className="text-gray-400 text-[11px] line-through">
                            LKR {Math.round(combo.originalTotalPrice)}
                          </Text>
                        )}
                      </View>
                      <Text className="text-gray-500 text-[10px]">
                        {combo.discountPercentage}% OFF • {combo.portionsRemaining} portions left • {combo.cuisineType || 'Home-style'}
                      </Text>
                    </View>

                    <Badge label="Active Deal" variant="success" />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};
