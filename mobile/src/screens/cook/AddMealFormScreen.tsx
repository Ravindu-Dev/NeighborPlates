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
  TextInput,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Toast } from '../../components/common/Toast';
import { api } from '../../services/api';
import {
  requestGalleryPermission,
  pickImageFromGallery,
  uploadImageToImgBB,
  validateImageSize,
} from '../../services/imageService';
import { DIETARY_OPTIONS } from '../../constants/filterConstants';

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

const CATEGORIES = [
  { key: 'BREAKFAST', label: 'Breakfast', icon: '🥞' },
  { key: 'LUNCH',     label: 'Lunch',     icon: '🍛' },
  { key: 'DINNER',    label: 'Dinner',    icon: '🍲' },
  { key: 'SNACK',     label: 'Snacks',    icon: '🍿' },
];

const CUISINE_PRESETS = ['Sri Lankan', 'South Indian', 'Rice & Curry', 'Healthy / Keto', 'Dessert', 'Western'];

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const AddMealFormScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mealToEdit = route.params?.mealToEdit;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [cuisineType, setCuisineType] = useState('Sri Lankan');
  const [category, setCategory] = useState('LUNCH');
  const [imageUrl, setImageUrl] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [allergens, setAllergens] = useState('');
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [portionLimit, setPortionLimit] = useState('10');
  const [cutoffTime, setCutoffTime] = useState('09:00');
  const [servingTime, setServingTime] = useState('12:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  const previewAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(previewAnim, {
      toValue: showPreview ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showPreview]);

  useEffect(() => {
    if (mealToEdit) {
      const populateFields = (m: any) => {
        setName(m.name || '');
        setDescription(m.description || '');
        setPrice(m.price ? String(m.price) : '');
        setCuisineType(m.cuisineType || 'Sri Lankan');
        setCategory(m.category || 'LUNCH');
        setImageUrl(m.photos?.[0] || '');
        setIngredients(m.ingredients?.join(', ') || '');
        setAllergens(m.allergenTags?.join(', ') || '');
        setDietaryPreferences(m.dietaryPreferences || []);
        setPortionLimit(m.portionLimit ? String(m.portionLimit) : '10');
        if (m.availability) {
          setCutoffTime(m.availability.cutoffTime || '09:00');
          setServingTime(m.availability.servingTime || '12:00');
          setSelectedDays(m.availability.days || ['MON', 'TUE', 'WED', 'THU', 'FRI']);
        }
      };

      populateFields(mealToEdit);

      if (mealToEdit.id) {
        api.get(`/api/meals/${mealToEdit.id}`)
          .then((res) => {
            if (res.data) populateFields(res.data);
          })
          .catch((err) => console.log('Error fetching fresh meal details:', err));
      }
    }
  }, [mealToEdit]);

  const handlePickFromGallery = async () => {
    try {
      const hasPermission = await requestGalleryPermission();
      if (!hasPermission) {
        setToast({ visible: true, message: 'Gallery permission is required to upload photos.', type: 'error' });
        return;
      }

      const asset = await pickImageFromGallery();
      if (!asset) return;

      await validateImageSize(asset);

      setImageUrl(asset.uri);
      setUploading(true);

      const cdnUrl = await uploadImageToImgBB(asset.uri);
      setImageUrl(cdnUrl);
      setToast({ visible: true, message: '📸 Image uploaded and linked successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Image upload error:', error);
      setImageUrl('');
      setToast({
        visible: true,
        message: error.message || 'Failed to upload image. Please try again.',
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const MAX_DESC_LENGTH = 250;

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const selectAllWeekdays = () => setSelectedDays(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const selectAllDays = () => setSelectedDays(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);

  const toggleDietaryPref = (pref: string) => {
    setDietaryPreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Please provide a meal title';
    if (!description.trim()) newErrors.description = 'Please describe your dish';
    if (!price || parseFloat(price) <= 0) newErrors.price = 'Enter a valid price in LKR';
    if (!portionLimit || parseInt(portionLimit, 10) <= 0) newErrors.portionLimit = 'Enter portions available per day';
    if (selectedDays.length === 0) newErrors.days = 'Select at least one available day';
    if (!cutoffTime.trim()) newErrors.cutoffTime = 'Order cutoff time required';
    if (!servingTime.trim()) newErrors.servingTime = 'Serving/pickup time required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) {
      setToast({ visible: true, message: 'Please complete all required fields.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name,
        description,
        price: parseFloat(price),
        category,
        cuisineType,
        photos: imageUrl.trim() ? [imageUrl.trim()] : [],
        ingredients: ingredients
          ? ingredients.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        allergenTags: allergens
          ? allergens.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        dietaryPreferences,
        portionLimit: parseInt(portionLimit, 10),
        availability: {
          days: selectedDays,
          cutoffTime,
          servingTime,
        },
        active: true,
      };

      if (mealToEdit) {
        await api.put(`/api/meals/${mealToEdit.id}`, payload);
      } else {
        await api.post('/api/meals', payload);
      }

      navigation.goBack();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to save meal listing. Please try again.';
      setToast({ visible: true, message: msg, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Calculations for 90% Net take-home
  const numericPrice = parseFloat(price) || 0;
  const platformFee = numericPrice * 0.1;
  const chefEarnings = numericPrice * 0.9;

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />

      {/* ─── Screen Header ─── */}
      <LinearGradient
        colors={[C.dark, C.darkMid]}
        style={S.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
          style={S.backBtn}
        >
          <Feather name="arrow-left" size={20} color={C.white} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <View style={S.headerTagRow}>
            <Text style={S.headerTag}>CHEF CULINARY STUDIO</Text>
          </View>
          <Text style={S.headerTitle}>
            {mealToEdit ? 'Edit Recipe Listing 📝' : 'Add New Dish 🍽️'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowPreview(!showPreview)}
          activeOpacity={0.8}
          style={[S.previewToggleBtn, showPreview && S.previewToggleBtnActive]}
        >
          <Feather
            name={showPreview ? 'eye-off' : 'eye'}
            size={14}
            color={showPreview ? C.white : C.greenLight}
          />
          <Text style={[S.previewToggleText, showPreview && S.previewToggleTextActive]}>
            {showPreview ? 'Hide' : 'Preview'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Live Customer Preview (Animated Card) ─── */}
        {showPreview && (
          <View style={S.previewCardWrapper}>
            <View style={S.previewHeaderRow}>
              <View style={S.previewLiveDot} />
              <Text style={S.previewLabel}>LIVE CUSTOMER VIEW</Text>
              <Text style={S.previewSub}>How diners will see your meal</Text>
            </View>

            <View style={S.liveCard}>
              <View style={S.livePhotoBox}>
                {imageUrl.trim() ? (
                  <Image source={{ uri: imageUrl.trim() }} style={S.liveImage} resizeMode="cover" />
                ) : (
                  <View style={S.liveImagePlaceholder}>
                    <Text style={{ fontSize: 44 }}>
                      {CATEGORIES.find((c) => c.key === category)?.icon || '🍛'}
                    </Text>
                  </View>
                )}
                <View style={S.liveCategoryBadge}>
                  <Text style={S.liveCategoryText}>{category}</Text>
                </View>
                <View style={S.livePriceBadge}>
                  <Text style={S.livePriceText}>LKR {numericPrice.toLocaleString()}</Text>
                </View>
              </View>

              <View style={S.liveBody}>
                <Text style={S.liveTitle} numberOfLines={1}>
                  {name.trim() || 'Untitled Delicious Dish'}
                </Text>
                <Text style={S.liveDesc} numberOfLines={2}>
                  {description.trim() || 'Freshly prepared homemade dish prepared with love and authentic ingredients.'}
                </Text>

                <View style={S.liveMetaRow}>
                  <View style={S.liveRatingPill}>
                    <Ionicons name="star" size={11} color="#FBBF24" />
                    <Text style={S.liveRatingText}>5.0 (New)</Text>
                  </View>
                  <Text style={S.liveTimeText}>⏰ {servingTime} ready</Text>
                  <Text style={S.livePortionsText}>🍱 {portionLimit} left</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ─── Card 1: Photography Studio ─── */}
        <View style={S.sectionCard}>
          <View style={S.cardHeaderRow}>
            <View style={[S.cardIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Feather name="camera" size={16} color={C.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.cardTitle}>Food Photography</Text>
              <Text style={S.cardSub}>Vibrant, high-resolution photos increase orders</Text>
            </View>
          </View>

          {/* Upload Dropzone */}
          <View style={S.dropzone}>
            {imageUrl.trim() ? (
              <View style={S.uploadedPreview}>
                <Image source={{ uri: imageUrl.trim() }} style={S.uploadedImage} resizeMode="cover" />
                {uploading && (
                  <View style={S.uploadingOverlay}>
                    <ActivityIndicator size="large" color={C.white} />
                    <Text style={S.uploadingText}>Optimizing and uploading...</Text>
                  </View>
                )}
                {!uploading && (
                  <View style={S.photoControls}>
                    <TouchableOpacity
                      onPress={handlePickFromGallery}
                      style={S.photoCtrlBtn}
                    >
                      <Feather name="refresh-cw" size={14} color={C.white} />
                      <Text style={S.photoCtrlText}>Replace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setImageUrl('')}
                      style={[S.photoCtrlBtn, { backgroundColor: 'rgba(239, 68, 68, 0.85)' }]}
                    >
                      <Feather name="trash-2" size={14} color={C.white} />
                      <Text style={S.photoCtrlText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickFromGallery}
                activeOpacity={0.8}
                style={S.emptyDropzone}
              >
                <View style={S.cameraCircle}>
                  <Feather name="upload-cloud" size={24} color={C.green} />
                </View>
                <Text style={S.uploadPromptTitle}>Upload High-Res Food Photo</Text>
                <Text style={S.uploadPromptSub}>Tap to browse camera roll or files</Text>
                <View style={S.uploadActionBtn}>
                  <Text style={S.uploadActionText}>Select from Gallery</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ─── Card 2: Dish Identity & Description ─── */}
        <View style={S.sectionCard}>
          <View style={S.cardHeaderRow}>
            <View style={[S.cardIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="book-open" size={16} color={C.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.cardTitle}>Dish Identity</Text>
              <Text style={S.cardSub}>Name, culinary style, and mouthwatering story</Text>
            </View>
          </View>

          {/* Dish Name */}
          <Text style={S.inputLabel}>DISH NAME *</Text>
          <View style={[S.inputBox, errors.name && S.inputBoxError]}>
            <TextInput
              placeholder="e.g. Village Style Claypot Chicken Biryani"
              placeholderTextColor={C.text3}
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              style={S.textInput}
            />
          </View>
          {errors.name ? <Text style={S.errorText}>{errors.name}</Text> : null}

          {/* Cuisine Type Quick Chips & Custom Input */}
          <Text style={[S.inputLabel, { marginTop: 14 }]}>CUISINE INSPIRATION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {CUISINE_PRESETS.map((c) => {
              const isSel = cuisineType === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCuisineType(c)}
                  style={[S.cuisineChip, isSel && S.cuisineChipActive]}
                >
                  <Text style={[S.cuisineChipText, isSel && S.cuisineChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={S.inputBox}>
            <TextInput
              placeholder="Or type custom cuisine..."
              placeholderTextColor={C.text3}
              value={cuisineType}
              onChangeText={setCuisineType}
              style={S.textInput}
            />
          </View>

          {/* Description */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 6 }}>
            <Text style={S.inputLabel}>FLAVOR STORY & DESCRIPTION *</Text>
            <Text style={[S.charCounter, description.length >= MAX_DESC_LENGTH && { color: C.red }]}>
              {description.length}/{MAX_DESC_LENGTH}
            </Text>
          </View>
          <View style={[S.textAreaBox, errors.description && S.inputBoxError]}>
            <TextInput
              placeholder="Describe the aroma, freshly ground spices, slow-cooking technique..."
              placeholderTextColor={C.text3}
              value={description}
              onChangeText={(t) => {
                if (t.length <= MAX_DESC_LENGTH) {
                  setDescription(t);
                  if (errors.description) setErrors({ ...errors, description: '' });
                }
              }}
              multiline
              numberOfLines={4}
              style={S.textAreaInput}
            />
          </View>
          {errors.description ? <Text style={S.errorText}>{errors.description}</Text> : null}
        </View>

        {/* ─── Card 3: Meal Category & Transparent Pricing ─── */}
        <View style={S.sectionCard}>
          <View style={S.cardHeaderRow}>
            <View style={[S.cardIconBox, { backgroundColor: '#FFFBEB' }]}>
              <Feather name="dollar-sign" size={16} color={C.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.cardTitle}>Category & Transparent Pricing</Text>
              <Text style={S.cardSub}>You keep 90% of every dish sold with zero hidden costs</Text>
            </View>
          </View>

          {/* Category Selector Grid */}
          <Text style={S.inputLabel}>MEAL SLOT *</Text>
          <View style={S.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isSel = category === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setCategory(cat.key)}
                  activeOpacity={0.8}
                  style={[S.categoryCard, isSel && S.categoryCardActive]}
                >
                  <Text style={{ fontSize: 22, marginBottom: 4 }}>{cat.icon}</Text>
                  <Text style={[S.categoryCardText, isSel && S.categoryCardTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Price Input */}
          <Text style={[S.inputLabel, { marginTop: 16 }]}>PRICE PER PORTION (LKR) *</Text>
          <View style={[S.priceInputRow, errors.price && S.inputBoxError]}>
            <Text style={S.pricePrefix}>LKR</Text>
            <TextInput
              placeholder="e.g. 850"
              placeholderTextColor={C.text3}
              value={price}
              onChangeText={(t) => {
                setPrice(t);
                if (errors.price) setErrors({ ...errors, price: '' });
              }}
              keyboardType="numeric"
              style={S.priceInput}
            />
          </View>
          {errors.price ? <Text style={S.errorText}>{errors.price}</Text> : null}

          {/* Dynamic 90% Net Take-Home Calculation Banner */}
          <LinearGradient
            colors={['#ECFDF5', '#E6F4EA']}
            style={S.takeHomeBanner}
          >
            <View style={S.takeHomeHeader}>
              <View style={S.takeHomeBadge}>
                <Feather name="shield" size={13} color={C.green} style={{ marginRight: 4 }} />
                <Text style={S.takeHomeBadgeText}>90% CHEF NET TAKE-HOME</Text>
              </View>
            </View>

            <View style={S.takeHomeRow}>
              <View>
                <Text style={S.takeHomeLabel}>Customer Pays</Text>
                <Text style={S.takeHomeValue}>LKR {numericPrice.toLocaleString()}</Text>
              </View>
              <Text style={S.takeHomeOp}>−</Text>
              <View>
                <Text style={S.takeHomeLabel}>NeighborPlates (10%)</Text>
                <Text style={[S.takeHomeValue, { color: C.red }]}>LKR {platformFee.toFixed(0)}</Text>
              </View>
              <Text style={S.takeHomeOp}>=</Text>
              <View>
                <Text style={S.takeHomeLabel}>Your Net Bank Deposit</Text>
                <Text style={[S.takeHomeValue, { color: C.green, fontWeight: '900' }]}>
                  LKR {chefEarnings.toFixed(0)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ─── Card 4: Ingredients, Allergens & Dietary Preferences ─── */}
        <View style={S.sectionCard}>
          <View style={S.cardHeaderRow}>
            <View style={[S.cardIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Feather name="feather" size={16} color={C.purple} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.cardTitle}>Ingredients & Dietary Badges</Text>
              <Text style={S.cardSub}>Help health-conscious neighbors find your dish</Text>
            </View>
          </View>

          {/* Dietary Preferences Chip Cloud */}
          <Text style={S.inputLabel}>DIETARY TAGS</Text>
          <View style={S.dietaryCloud}>
            {DIETARY_OPTIONS.map((pref) => {
              const isSel = dietaryPreferences.includes(pref);
              return (
                <TouchableOpacity
                  key={pref}
                  onPress={() => toggleDietaryPref(pref)}
                  style={[S.dietaryChip, isSel && S.dietaryChipActive]}
                >
                  <Text style={[S.dietaryChipText, isSel && S.dietaryChipTextActive]}>
                    {pref}
                  </Text>
                  {isSel && (
                    <Feather name="check" size={12} color={C.white} style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Ingredients Input */}
          <Text style={[S.inputLabel, { marginTop: 14 }]}>KEY INGREDIENTS</Text>
          <View style={S.inputBox}>
            <TextInput
              placeholder="e.g. Cardamom, Coconut Cream, Roasted Spices, Curry Leaves"
              placeholderTextColor={C.text3}
              value={ingredients}
              onChangeText={setIngredients}
              style={S.textInput}
            />
          </View>
          <Text style={S.helperText}>Separate each ingredient with a comma</Text>

          {/* Allergens Input */}
          <Text style={[S.inputLabel, { marginTop: 12 }]}>ALLERGEN WARNINGS</Text>
          <View style={S.inputBox}>
            <TextInput
              placeholder="e.g. Peanuts, Dairy, Gluten, Shellfish"
              placeholderTextColor={C.text3}
              value={allergens}
              onChangeText={setAllergens}
              style={S.textInput}
            />
          </View>
        </View>

        {/* ─── Card 5: Daily Portions & Schedule ─── */}
        <View style={S.sectionCard}>
          <View style={S.cardHeaderRow}>
            <View style={[S.cardIconBox, { backgroundColor: '#FEF2F2' }]}>
              <Feather name="clock" size={16} color={C.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.cardTitle}>Batch Capacity & Timings</Text>
              <Text style={S.cardSub}>Define daily limits and ordering cutoff window</Text>
            </View>
          </View>

          {/* Daily Portions Limit with Presets */}
          <Text style={S.inputLabel}>MAX PORTIONS PER BATCH *</Text>
          <View style={S.portionPresetsRow}>
            {['5', '10', '15', '20', '30'].map((p) => {
              const isSel = portionLimit === p;
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPortionLimit(p)}
                  style={[S.portionPresetPill, isSel && S.portionPresetPillActive]}
                >
                  <Text style={[S.portionPresetText, isSel && S.portionPresetTextActive]}>{p}</Text>
                  <Text style={[S.portionPresetSub, isSel && S.portionPresetSubActive]}>pcs</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={[S.inputBox, errors.portionLimit && S.inputBoxError]}>
            <TextInput
              placeholder="Or enter custom batch capacity..."
              placeholderTextColor={C.text3}
              value={portionLimit}
              onChangeText={(t) => {
                setPortionLimit(t);
                if (errors.portionLimit) setErrors({ ...errors, portionLimit: '' });
              }}
              keyboardType="numeric"
              style={S.textInput}
            />
          </View>
          {errors.portionLimit ? <Text style={S.errorText}>{errors.portionLimit}</Text> : null}

          {/* Available Days Selector */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
            <Text style={S.inputLabel}>AVAILABLE DAYS *</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={selectAllWeekdays}>
                <Text style={S.dayShortcutText}>Weekdays</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={selectAllDays}>
                <Text style={S.dayShortcutText}>Everyday</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={S.daysGrid}>
            {DAYS.map((day) => {
              const isSel = selectedDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => toggleDay(day)}
                  style={[S.dayChip, isSel && S.dayChipActive]}
                >
                  <Text style={[S.dayChipText, isSel && S.dayChipTextActive]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.days ? <Text style={S.errorText}>{errors.days}</Text> : null}

          {/* Cutoff & Serving Times */}
          <View style={S.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={S.inputLabel}>ORDER CUTOFF *</Text>
              <View style={[S.inputBox, errors.cutoffTime && S.inputBoxError]}>
                <Feather name="clock" size={14} color={C.text3} style={{ marginRight: 6 }} />
                <TextInput
                  placeholder="09:00"
                  placeholderTextColor={C.text3}
                  value={cutoffTime}
                  onChangeText={(t) => {
                    setCutoffTime(t);
                    if (errors.cutoffTime) setErrors({ ...errors, cutoffTime: '' });
                  }}
                  style={S.textInput}
                />
              </View>
            </View>

            <View style={{ width: 12 }} />

            <View style={{ flex: 1 }}>
              <Text style={S.inputLabel}>READY TIME *</Text>
              <View style={[S.inputBox, errors.servingTime && S.inputBoxError]}>
                <Feather name="check-circle" size={14} color={C.text3} style={{ marginRight: 6 }} />
                <TextInput
                  placeholder="12:00"
                  placeholderTextColor={C.text3}
                  value={servingTime}
                  onChangeText={(t) => {
                    setServingTime(t);
                    if (errors.servingTime) setErrors({ ...errors, servingTime: '' });
                  }}
                  style={S.textInput}
                />
              </View>
            </View>
          </View>
        </View>

        {/* ─── Submit Action Button ─── */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={submitting}
          activeOpacity={0.88}
          style={S.publishBtn}
        >
          <LinearGradient
            colors={[C.greenLight, C.green]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={S.publishGradient}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <>
                <Text style={{ fontSize: 18, marginRight: 8 }}>🍽️</Text>
                <Text style={S.publishBtnText}>
                  {mealToEdit ? 'SAVE & UPDATE DISH' : 'PUBLISH DISH TO MENU'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
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
  header: {
    paddingTop: Platform.OS === 'ios' ? 52 : 42,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTagRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  headerTag: {
    fontSize: 9,
    fontWeight: '800',
    color: C.greenLight,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: C.white,
    letterSpacing: -0.3,
  },
  previewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(82, 183, 136, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(82, 183, 136, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  previewToggleBtnActive: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  previewToggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.greenLight,
  },
  previewToggleTextActive: {
    color: C.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Live Preview Wrapper
  previewCardWrapper: {
    marginBottom: 16,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  previewLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.text1,
    letterSpacing: 0.6,
  },
  previewSub: {
    fontSize: 10,
    color: C.text3,
    fontWeight: '600',
  },
  liveCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  livePhotoBox: {
    height: 140,
    backgroundColor: '#0F1923',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveImage: {
    width: '100%',
    height: '100%',
  },
  liveImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveCategoryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(15, 25, 35, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveCategoryText: {
    color: C.white,
    fontSize: 9,
    fontWeight: '800',
  },
  livePriceBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  livePriceText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '900',
  },
  liveBody: {
    padding: 14,
  },
  liveTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: C.text1,
    marginBottom: 4,
  },
  liveDesc: {
    fontSize: 11,
    color: C.text2,
    lineHeight: 16,
    marginBottom: 10,
  },
  liveMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  liveRatingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  liveTimeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.text3,
  },
  livePortionsText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.green,
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
    gap: 12,
    marginBottom: 16,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Dropzone Photo Studio
  dropzone: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  emptyDropzone: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  cameraCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  uploadPromptTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.text1,
    marginBottom: 4,
  },
  uploadPromptSub: {
    fontSize: 11,
    color: C.text3,
    fontWeight: '500',
    marginBottom: 14,
  },
  uploadActionBtn: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  uploadActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.green,
  },
  uploadedPreview: {
    height: 200,
    position: 'relative',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 25, 35, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
  photoControls: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  photoCtrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 25, 35, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 5,
  },
  photoCtrlText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '800',
  },

  // Form Inputs
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.text2,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  charCounter: {
    fontSize: 10,
    fontWeight: '700',
    color: C.text3,
  },
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
  inputBoxError: {
    borderColor: C.red,
    backgroundColor: '#FEF2F2',
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: C.text1,
    padding: 0,
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
    minHeight: 70,
    textAlignVertical: 'top',
    padding: 0,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.red,
    marginTop: 4,
    marginLeft: 2,
  },
  helperText: {
    fontSize: 10,
    fontWeight: '500',
    color: C.text3,
    marginTop: 4,
    marginLeft: 2,
  },

  // Cuisine Chips
  cuisineChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  cuisineChipActive: {
    backgroundColor: C.blue,
  },
  cuisineChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.text2,
  },
  cuisineChipTextActive: {
    color: C.white,
  },

  // Category Grid
  categoryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    alignItems: 'center',
  },
  categoryCardActive: {
    backgroundColor: '#ECFDF5',
    borderColor: C.green,
  },
  categoryCardText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.text2,
  },
  categoryCardTextActive: {
    color: C.green,
  },

  // Price Input
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pricePrefix: {
    fontSize: 14,
    fontWeight: '900',
    color: C.green,
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    color: C.text1,
    padding: 0,
  },

  // Take Home Calculator
  takeHomeBanner: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(45, 106, 79, 0.2)',
  },
  takeHomeHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  takeHomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  takeHomeBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: C.green,
    letterSpacing: 0.8,
  },
  takeHomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  takeHomeLabel: {
    fontSize: 9,
    color: C.text2,
    fontWeight: '600',
    marginBottom: 2,
  },
  takeHomeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: C.text1,
  },
  takeHomeOp: {
    fontSize: 14,
    fontWeight: '900',
    color: C.text3,
  },

  // Dietary Tag Cloud
  dietaryCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dietaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  dietaryChipActive: {
    backgroundColor: C.purple,
    borderColor: C.purple,
  },
  dietaryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.text2,
  },
  dietaryChipTextActive: {
    color: C.white,
  },

  // Portions Presets
  portionPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  portionPresetPill: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    alignItems: 'center',
  },
  portionPresetPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: C.green,
  },
  portionPresetText: {
    fontSize: 13,
    fontWeight: '900',
    color: C.text1,
  },
  portionPresetTextActive: {
    color: C.green,
  },
  portionPresetSub: {
    fontSize: 8,
    fontWeight: '700',
    color: C.text3,
  },
  portionPresetSubActive: {
    color: C.green,
  },

  // Days Grid
  dayShortcutText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.green,
  },
  daysGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayChipActive: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  dayChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.text2,
  },
  dayChipTextActive: {
    color: C.white,
  },

  // Time Row
  timeRow: {
    flexDirection: 'row',
  },

  // Submit Publish Button
  publishBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 20,
  },
  publishGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  publishBtnText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
