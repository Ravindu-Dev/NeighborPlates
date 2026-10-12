import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type UserRoleType = 'CUSTOMER' | 'COOK' | 'RIDER';

interface AuthTopBarProps {
  onBackToLogin: () => void;
  title?: string;
}

export const AuthTopBar: React.FC<AuthTopBarProps> = ({ onBackToLogin, title }) => {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 12);

  return (
    <View style={[styles.topBarContainer, { paddingTop: topPadding + 6 }]}>
      <TouchableOpacity
        onPress={onBackToLogin}
        style={styles.backButton}
        activeOpacity={0.7}
        accessibilityLabel="Back to Login"
      >
        <Feather name="arrow-left" size={18} color="#1A1A2E" />
        <Text style={styles.backButtonText}>Login</Text>
      </TouchableOpacity>

      {title ? (
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
      <View style={{ width: 40 }} />
    </View>
  );
};

interface AuthRoleTabsProps {
  currentRole: UserRoleType;
  onSelectRole: (role: UserRoleType) => void;
}

const ROLES: { key: UserRoleType; label: string; icon: keyof typeof Feather.glyphMap; color: string }[] = [
  { key: 'CUSTOMER', label: 'Customer', icon: 'shopping-bag', color: '#FF6B35' },
  { key: 'COOK', label: 'Local Cook', icon: 'coffee', color: '#2D6A4F' },
  { key: 'RIDER', label: 'Food Rider', icon: 'send', color: '#4F46E5' },
];

export const AuthRoleTabs: React.FC<AuthRoleTabsProps> = ({ currentRole, onSelectRole }) => {
  return (
    <View style={styles.tabsOuterWrapper}>
      <View style={styles.tabsWrapper}>
        {ROLES.map((role) => {
          const isActive = currentRole === role.key;
          return (
            <TouchableOpacity
              key={role.key}
              onPress={() => onSelectRole(role.key)}
              activeOpacity={0.8}
              style={[
                styles.tabItem,
                isActive && {
                  backgroundColor: role.color,
                  shadowColor: role.color,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  elevation: 2,
                },
              ]}
            >
              <Feather
                name={role.icon}
                size={13}
                color={isActive ? '#FFFFFF' : '#6B7280'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.activeTabLabel : styles.inactiveTabLabel,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {role.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Backwards-compatible compound export
export const AuthRoleSwitcher: React.FC<AuthRoleTabsProps> = (props) => {
  return <AuthRoleTabs {...props} />;
};

const styles = StyleSheet.create({
  topBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  topBarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabsOuterWrapper: {
    width: '100%',
    marginVertical: 14,
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 13,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  activeTabLabel: {
    color: '#FFFFFF',
  },
  inactiveTabLabel: {
    color: '#6B7280',
  },
});
