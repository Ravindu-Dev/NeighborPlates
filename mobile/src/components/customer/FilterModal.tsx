import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { FilterChip } from '../common/FilterChip';
import { Button } from '../common/Button';
import { DropdownPicker } from '../common/DropdownPicker';
import {
  DIETARY_OPTIONS,
  CATEGORIES_LIST,
  DISTRICT_TOWN_DATA,
} from '../../constants/filterConstants';

export interface FilterState {
  category: string;
  dietaryPreferences: string[];
  district: string;
  town: string;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
  onResetFilters: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedTown, setSelectedTown] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setSelectedCategory(filters.category || 'ALL');
      setSelectedDietary(filters.dietaryPreferences || []);
      setSelectedDistrict(filters.district || '');
      setSelectedTown(filters.town || '');
    }
  }, [visible, filters]);

  const toggleDietary = (pref: string) => {
    setSelectedDietary((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  const handleApply = () => {
    onApplyFilters({
      category: selectedCategory,
      dietaryPreferences: selectedDietary,
      district: selectedDistrict,
      town: selectedTown,
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedCategory('ALL');
    setSelectedDietary([]);
    setSelectedDistrict('');
    setSelectedTown('');
    onResetFilters();
    onClose();
  };

  const activeCount =
    (selectedCategory !== 'ALL' ? 1 : 0) +
    selectedDietary.length +
    (selectedDistrict ? 1 : 0) +
    (selectedTown ? 1 : 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={
          {
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            ...(Platform.OS === 'web'
              ? {
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100vw',
                  height: '100vh',
                  zIndex: 99999,
                }
              : {}),
          } as any
        }
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View className="bg-white rounded-t-[36px] max-h-[85%] min-h-[60%] flex-col border-t border-gray-100 shadow-2xl relative">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
            <View className="flex-row items-center gap-2">
              <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center border border-primary/20">
                <Feather name="sliders" size={16} color="#FF6B35" />
              </View>
              <View>
                <Text className="text-textPrimary font-black text-lg">Filter Meals & Kitchens</Text>
                <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider">
                  {activeCount > 0 ? `${activeCount} ACTIVE FILTERS` : 'SELECT FILTER CRITERIA'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center border border-gray-200"
            >
              <Ionicons name="close" size={18} color="#4B5563" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
            {/* ─── 1. Dietary Preferences Filter ─── */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="leaf-outline" size={13} color="#10B981" />
                  <Text className="text-textPrimary font-black text-xs uppercase tracking-wider">
                    Dietary Preferences
                  </Text>
                </View>
                {selectedDietary.length > 0 && (
                  <TouchableOpacity onPress={() => setSelectedDietary([])}>
                    <Text className="text-primary font-bold text-[10px] uppercase">Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text className="text-textMuted text-[10px] mb-3 font-medium">
                Find meals matching your dietary restrictions
              </Text>
              <View className="flex-row flex-wrap">
                {DIETARY_OPTIONS.map((pref) => {
                  const isSelected = selectedDietary.includes(pref);
                  return (
                    <FilterChip
                      key={pref}
                      label={pref}
                      selected={isSelected}
                      onPress={() => toggleDietary(pref)}
                      className="mr-2 mb-2"
                    />
                  );
                })}
              </View>
            </View>

            {/* ─── 2. Meal Categories Filter ─── */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-1.5">
                  <Feather name="grid" size={13} color="#FF6B35" />
                  <Text className="text-textPrimary font-black text-xs uppercase tracking-wider">
                    Meal Category
                  </Text>
                </View>
                {selectedCategory !== 'ALL' && (
                  <TouchableOpacity onPress={() => setSelectedCategory('ALL')}>
                    <Text className="text-primary font-bold text-[10px] uppercase">Reset</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View className="flex-row flex-wrap">
                {CATEGORIES_LIST.map((cat) => {
                  const isSelected = selectedCategory === cat.key;
                  return (
                    <FilterChip
                      key={cat.key}
                      label={cat.label}
                      selected={isSelected}
                      onPress={() => setSelectedCategory(cat.key)}
                      className="mr-2 mb-2"
                    />
                  );
                })}
              </View>
            </View>

            {/* ─── 3. Location Filter (District & Town) ─── */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-1.5">
                  <Feather name="map-pin" size={13} color="#3B82F6" />
                  <Text className="text-textPrimary font-black text-xs uppercase tracking-wider">
                    Cook Location
                  </Text>
                </View>
                {(selectedDistrict || selectedTown) ? (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedDistrict('');
                      setSelectedTown('');
                    }}
                  >
                    <Text className="text-primary font-bold text-[10px] uppercase">Clear Location</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <DropdownPicker
                label="DISTRICT"
                placeholder="All Districts..."
                selectedValue={selectedDistrict}
                onValueChange={(val) => {
                  setSelectedDistrict(val);
                  setSelectedTown('');
                }}
                options={Object.keys(DISTRICT_TOWN_DATA)}
                iconName="map-pin"
              />

              <DropdownPicker
                label="TOWN / NEIGHBORHOOD"
                placeholder={selectedDistrict ? 'All Towns in ' + selectedDistrict + '...' : 'Select District first...'}
                selectedValue={selectedTown}
                onValueChange={setSelectedTown}
                options={selectedDistrict ? DISTRICT_TOWN_DATA[selectedDistrict] || [] : []}
                disabled={!selectedDistrict}
                iconName="navigation"
              />
            </View>

            <View className="h-6" />
          </ScrollView>

          {/* Modal Action Footer */}
          <View className="p-6 bg-gray-50 border-t border-gray-100 flex-row gap-3">
            <TouchableOpacity
              onPress={handleReset}
              activeOpacity={0.7}
              className="flex-1 py-3.5 rounded-2xl bg-white border border-gray-200 items-center justify-center shadow-xs"
            >
              <Text className="text-textSecondary font-bold text-xs uppercase tracking-wider">
                RESET ALL
              </Text>
            </TouchableOpacity>

            <View className="flex-2 flex-1">
              <Button
                title={`APPLY FILTERS (${activeCount})`}
                onPress={handleApply}
                variant="primary"
                size="md"
                className="w-full"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
