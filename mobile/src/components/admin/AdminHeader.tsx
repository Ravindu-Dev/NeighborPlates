import React from 'react';
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: {
    icon: keyof typeof Feather.glyphMap;
    onPress: () => void;
    label?: string;
  };
  badge?: {
    text: string;
    color?: 'green' | 'amber' | 'red' | 'blue';
  };
  showLogout?: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  subtitle,
  rightAction,
  badge,
  showLogout = true,
}) => {
  const { logout } = useAuthStore();

  const handleHeaderLogout = () => {
    const doLogout = async () => {
      try {
        await logout();
      } catch (err) {
        console.error('Logout error:', err);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm) {
        if (window.confirm('Are you sure you want to sign out of the admin panel?')) {
          doLogout();
        }
      } else {
        doLogout();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out of the admin panel?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: doLogout },
        ]
      );
    }
  };

  const badgeColors = {
    green: { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: '#10B981', text: 'text-emerald-700' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', dot: '#F59E0B', text: 'text-amber-700' },
    red: { bg: 'bg-red-50', border: 'border-red-200', dot: '#EF4444', text: 'text-red-700' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', dot: '#3B82F6', text: 'text-blue-700' },
  };

  const badgeStyle = badge ? badgeColors[badge.color || 'green'] : null;

  return (
    <View className="px-5 pt-4 pb-3 bg-white border-b border-gray-100">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-textPrimary text-xl font-black tracking-tight" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-textMuted text-xs mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View className="flex-row items-center gap-2">
          {badge && badgeStyle ? (
            <View
              className={`flex-row items-center ${badgeStyle.bg} px-2.5 py-1 rounded-full border ${badgeStyle.border}`}
            >
              <View
                className="w-1.5 h-1.5 rounded-full mr-1.5"
                style={{ backgroundColor: badgeStyle.dot }}
              />
              <Text className={`${badgeStyle.text} text-[10px] font-bold uppercase tracking-wider`}>
                {badge.text}
              </Text>
            </View>
          ) : null}

          {rightAction ? (
            <TouchableOpacity
              onPress={rightAction.onPress}
              className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center border border-gray-200"
              activeOpacity={0.7}
            >
              <Feather name={rightAction.icon} size={16} color="#1A1A2E" />
            </TouchableOpacity>
          ) : null}

          {showLogout && (
            <TouchableOpacity
              onPress={handleHeaderLogout}
              className="w-9 h-9 rounded-full bg-red-50 items-center justify-center border border-red-200"
              activeOpacity={0.7}
              accessibilityLabel="Sign out of admin"
            >
              <Feather name="log-out" size={15} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};
