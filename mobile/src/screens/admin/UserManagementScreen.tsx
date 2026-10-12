import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { useAuthStore } from '../../store/authStore';
import { Feather } from '@expo/vector-icons';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { SearchBar } from '../../components/admin/SearchBar';

type RoleTab = 'cooks' | 'customers' | 'riders';
type VerificationFilter = 'all' | 'verified' | 'unverified';
type StatusFilter = 'all' | 'active' | 'suspended';

const VEHICLE_ICONS: Record<string, string> = {
  Motorcycle: '🛵',
  Bicycle: '🚲',
  Car: '🚗',
  Walking: '🚶',
  'E-Bike': '⚡',
};

const getVehicleIcon = (type?: string) =>
  type ? (VEHICLE_ICONS[type] || '🛵') : '🛵';

const formatDate = (iso?: string) => {
  if (!iso) return 'Unknown';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const UserManagementScreen: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<RoleTab>('cooks');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/admin/users');
      setUsers(response.data);
      setSelectedUser((prev: any) => {
        if (!prev) return prev;
        return response.data.find((u: any) => u.id === prev.id) || prev;
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const allCooks = users.filter((u: any) => u.role === 'COOK');
  const allCustomers = users.filter((u: any) => u.role === 'CUSTOMER');
  const allRiders = users.filter((u: any) => u.role === 'RIDER');

  const pendingCooks = allCooks.filter((u: any) => !u.profile?.hygieneVerified).length;
  const pendingRiders = allRiders.filter((u: any) => !u.profile?.riderVerified).length;

  const rawList = activeTab === 'cooks' ? allCooks : activeTab === 'customers' ? allCustomers : allRiders;

  const displayData = useMemo(() => {
    let list = rawList;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (u: any) =>
          u.profile?.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.profile?.phone?.includes(q) ||
          u.id?.toLowerCase().includes(q)
      );
    }

    // Verification filter
    if (verificationFilter !== 'all') {
      if (activeTab === 'cooks') {
        list = list.filter((u: any) =>
          verificationFilter === 'verified' ? u.profile?.hygieneVerified : !u.profile?.hygieneVerified
        );
      } else if (activeTab === 'riders') {
        list = list.filter((u: any) =>
          verificationFilter === 'verified' ? u.profile?.riderVerified : !u.profile?.riderVerified
        );
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((u: any) =>
        statusFilter === 'active' ? u.active !== false : u.active === false
      );
    }

    return list;
  }, [rawList, searchQuery, verificationFilter, statusFilter]);

  const handleVerify = async (userId: string) => {
    Alert.alert(
      'Verify Cook',
      'Confirm cook account verification? This marks the cook as hygiene verified on the platform.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.put(`/api/admin/users/${userId}/verify`);
              await fetchUsers();
              Alert.alert('Verified', 'Cook account has been verified successfully.');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to verify cook.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleVerifyRider = async (userId: string, currentlyVerified: boolean) => {
    Alert.alert(
      currentlyVerified ? 'Revoke Rider Verification' : 'Verify Rider',
      currentlyVerified
        ? 'Are you sure you want to revoke this rider\'s verification? They will no longer be able to accept deliveries.'
        : 'Confirm rider verification? This allows them to receive delivery assignments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentlyVerified ? 'Revoke' : 'Verify',
          style: currentlyVerified ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.put(`/api/admin/riders/${userId}/verify`);
              await fetchUsers();
              Alert.alert(
                'Done',
                `Rider verification ${currentlyVerified ? 'revoked' : 'approved'} successfully.`
              );
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to update rider verification.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    Alert.alert(
      currentActive ? 'Suspend Account' : 'Reactivate Account',
      currentActive
        ? 'Suspending this account will immediately prevent the user from logging in or using the platform.'
        : 'Reactivating will restore full platform access for this user.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentActive ? 'Suspend' : 'Reactivate',
          style: currentActive ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.put(`/api/admin/users/${userId}/toggle-active`);
              await fetchUsers();
              Alert.alert('Done', `User account ${currentActive ? 'suspended' : 'reactivated'}.`);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to update account status.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const tabs: { id: RoleTab; label: string; count: number; pendingCount?: number }[] = [
    { id: 'cooks', label: 'Cooks', count: allCooks.length, pendingCount: pendingCooks },
    { id: 'customers', label: 'Customers', count: allCustomers.length },
    { id: 'riders', label: 'Riders', count: allRiders.length, pendingCount: pendingRiders },
  ];

  const showVerificationFilter = activeTab !== 'customers';

  const renderUserCard = ({ item }: { item: any }) => {
    const isCook = item.role === 'COOK';
    const isRider = item.role === 'RIDER';

    return (
      <Card className="mb-3 overflow-hidden" bordered>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setSelectedUser(item)}
          className="flex-row items-center mb-3"
        >
          {/* Avatar */}
          <TouchableOpacity
            activeOpacity={item.profile?.avatarUrl ? 0.8 : 1}
            disabled={!item.profile?.avatarUrl}
            onPress={() => {
              if (item.profile?.avatarUrl) setSelectedAvatarUrl(item.profile.avatarUrl);
            }}
            className="w-11 h-11 rounded-full bg-primary/10 items-center justify-center border-2 border-primary/20 overflow-hidden mr-3"
          >
            {item.profile?.avatarUrl ? (
              <Image source={{ uri: item.profile.avatarUrl }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <Text className="text-primary font-black text-base">
                {(item.profile?.name || item.email || '?').charAt(0).toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>

          {/* Name & Info */}
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-textPrimary font-extrabold text-sm flex-1" numberOfLines={1}>
                {item.profile?.name || 'Unnamed User'}
              </Text>
              <Feather name="chevron-right" size={14} color="#9CA3AF" />
            </View>
            <Text className="text-textSecondary text-xs mt-0.5" numberOfLines={1}>
              {item.email}
            </Text>
            {item.profile?.phone && (
              <Text className="text-textMuted text-[11px]">{item.profile.phone}</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Status Badges */}
        <View className="flex-row flex-wrap gap-1.5 mb-3">
          <Badge
            label={item.active !== false ? 'Active' : 'Suspended'}
            variant={item.active !== false ? 'success' : 'error'}
          />
          {isCook && (
            <Badge
              label={item.profile?.hygieneVerified ? 'Verified ✓' : 'Unverified'}
              variant={item.profile?.hygieneVerified ? 'success' : 'warning'}
            />
          )}
          {isRider && (
            <>
              <Badge
                label={item.profile?.riderVerified ? 'Rider Verified ✓' : 'Pending'}
                variant={item.profile?.riderVerified ? 'success' : 'warning'}
              />
              <Badge
                label={item.profile?.isAvailable ? 'Online' : 'Offline'}
                variant={item.profile?.isAvailable ? 'primary' : 'neutral'}
              />
            </>
          )}
          {isCook && item.profile?.district && (
            <View className="flex-row items-center bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
              <Feather name="map-pin" size={9} color="#6B7280" />
              <Text className="text-gray-500 text-[10px] font-semibold ml-1">
                {item.profile.district}
              </Text>
            </View>
          )}
          {isRider && item.profile?.vehicleType && (
            <View className="flex-row items-center bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
              <Text className="text-[10px]">{getVehicleIcon(item.profile.vehicleType)}</Text>
              <Text className="text-gray-500 text-[10px] font-semibold ml-1">
                {item.profile.vehicleType}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View className="flex-row gap-2 border-t border-gray-100 pt-3">
          {isCook && !item.profile?.hygieneVerified && item.active !== false && (
            <Button
              title="VERIFY"
              onPress={() => handleVerify(item.id)}
              size="sm"
              className="flex-1"
            />
          )}
          {isRider && item.active !== false && (
            <Button
              title={item.profile?.riderVerified ? 'REVOKE' : 'VERIFY'}
              onPress={() => handleVerifyRider(item.id, item.profile?.riderVerified)}
              variant={item.profile?.riderVerified ? 'outline' : 'primary'}
              size="sm"
              className="flex-1"
            />
          )}
          {item.email !== currentUser?.email && (
            <Button
              title={item.active !== false ? 'SUSPEND' : 'ACTIVATE'}
              onPress={() => handleToggleActive(item.id, item.active !== false)}
              variant="outline"
              size="sm"
              className="flex-1"
            />
          )}
          <Button
            title="DETAILS"
            onPress={() => setSelectedUser(item)}
            variant="outline"
            size="sm"
            className="flex-1"
          />
        </View>
      </Card>
    );
  };

  const renderSkeletons = () =>
    Array.from({ length: 4 }).map((_, i) => (
      <View key={i} className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
        <View className="flex-row items-center mb-3">
          <SkeletonLoader width={44} height={44} borderRadius={22} />
          <View className="flex-1 ml-3">
            <SkeletonLoader height={14} width="60%" className="mb-2" />
            <SkeletonLoader height={11} width="80%" />
          </View>
        </View>
        <View className="flex-row gap-2 mb-3">
          <SkeletonLoader height={22} width={70} borderRadius={11} />
          <SkeletonLoader height={22} width={80} borderRadius={11} />
        </View>
        <SkeletonLoader height={34} borderRadius={10} />
      </View>
    ));

  return (
    <View className="flex-1 bg-surface-elevated">
      <AdminHeader
        title="User Management"
        subtitle={`${users.length} total users`}
        rightAction={{
          icon: 'refresh-cw',
          onPress: handleRefresh,
        }}
      />

      {/* Summary Stats Row */}
      {!loading && (
        <View className="flex-row px-4 pt-3 gap-2">
          <View className="flex-1 bg-white rounded-2xl py-2.5 px-3 border border-gray-100 items-center">
            <Text className="text-textPrimary font-black text-lg">{allCooks.length}</Text>
            <Text className="text-textMuted text-[9px] font-bold uppercase">Cooks</Text>
            {pendingCooks > 0 && (
              <Text className="text-amber-600 text-[9px] font-bold">{pendingCooks} pending</Text>
            )}
          </View>
          <View className="flex-1 bg-white rounded-2xl py-2.5 px-3 border border-gray-100 items-center">
            <Text className="text-textPrimary font-black text-lg">{allCustomers.length}</Text>
            <Text className="text-textMuted text-[9px] font-bold uppercase">Customers</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl py-2.5 px-3 border border-gray-100 items-center">
            <Text className="text-textPrimary font-black text-lg">{allRiders.length}</Text>
            <Text className="text-textMuted text-[9px] font-bold uppercase">Riders</Text>
            {pendingRiders > 0 && (
              <Text className="text-amber-600 text-[9px] font-bold">{pendingRiders} pending</Text>
            )}
          </View>
        </View>
      )}

      {/* Tab Switcher */}
      <View className="flex-row border-b border-gray-100 bg-white mt-3">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => {
              setActiveTab(tab.id);
              setSearchQuery('');
              setVerificationFilter('all');
              setStatusFilter('all');
            }}
            className={`flex-1 py-3.5 items-center border-b-2 ${
              activeTab === tab.id ? 'border-primary' : 'border-transparent'
            }`}
          >
            <Text
              className={`font-bold text-xs ${
                activeTab === tab.id ? 'text-primary' : 'text-textSecondary'
              }`}
            >
              {tab.label} ({tab.count})
            </Text>
            {(tab.pendingCount ?? 0) > 0 && (
              <View className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 items-center justify-center">
                <Text className="text-white text-[8px] font-black">{tab.pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View className="px-4 pt-3 pb-1">
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={`Search ${activeTab} by name, email, phone...`}
        />
      </View>

      {/* Filters */}
      <View className="px-4 pt-1 pb-2 flex-row gap-2 flex-wrap">
        {/* Status filter */}
        {(['all', 'active', 'suspended'] as StatusFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-full border ${
              statusFilter === f ? 'bg-primary border-primary' : 'bg-white border-gray-200'
            }`}
            activeOpacity={0.7}
          >
            <Text
              className={`text-[11px] font-bold capitalize ${
                statusFilter === f ? 'text-white' : 'text-textSecondary'
              }`}
            >
              {f === 'all' ? 'All Status' : f}
            </Text>
          </TouchableOpacity>
        ))}

        {showVerificationFilter &&
          (['all', 'verified', 'unverified'] as VerificationFilter[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setVerificationFilter(f)}
              className={`px-3 py-1.5 rounded-full border ${
                verificationFilter === f ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-gray-200'
              }`}
              activeOpacity={0.7}
            >
              <Text
                className={`text-[11px] font-bold capitalize ${
                  verificationFilter === f ? 'text-white' : 'text-textSecondary'
                }`}
              >
                {f === 'all' ? 'Any Verification' : f}
              </Text>
            </TouchableOpacity>
          ))}
      </View>

      {loading ? (
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {renderSkeletons()}
        </ScrollView>
      ) : displayData.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <View className="w-16 h-16 rounded-full bg-gray-50 items-center justify-center mb-4">
            <Feather name="users" size={28} color="#9CA3AF" />
          </View>
          <Text className="text-textPrimary font-bold text-base text-center">
            {searchQuery || verificationFilter !== 'all' || statusFilter !== 'all'
              ? 'No Matching Users'
              : `No ${activeTab} found`}
          </Text>
          <Text className="text-textMuted text-xs text-center mt-2 leading-relaxed">
            {searchQuery
              ? 'Try adjusting your search terms or filters.'
              : `No ${activeTab} are registered on the platform yet.`}
          </Text>
          {(searchQuery || verificationFilter !== 'all' || statusFilter !== 'all') && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setVerificationFilter('all');
                setStatusFilter('all');
              }}
              className="mt-4 bg-primary/10 px-4 py-2 rounded-full"
            >
              <Text className="text-primary font-bold text-xs">Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF6B35']} tintColor="#FF6B35" />
          }
          renderItem={renderUserCard}
        />
      )}

      {/* User Details Modal */}
      <Modal
        visible={!!selectedUser}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedUser(null)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl" style={{ maxHeight: '92%' }}>
            {/* Modal Header */}
            <View className="flex-row justify-between items-center p-5 border-b border-gray-100">
              <View className="flex-row items-center gap-3 flex-1">
                <TouchableOpacity
                  activeOpacity={selectedUser?.profile?.avatarUrl ? 0.8 : 1}
                  disabled={!selectedUser?.profile?.avatarUrl}
                  onPress={() => {
                    if (selectedUser?.profile?.avatarUrl)
                      setSelectedAvatarUrl(selectedUser.profile.avatarUrl);
                  }}
                  className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center border-2 border-primary/20 overflow-hidden"
                >
                  {selectedUser?.profile?.avatarUrl ? (
                    <>
                      <Image
                        source={{ uri: selectedUser.profile.avatarUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                      <View className="absolute bottom-0 inset-x-0 bg-black/50 py-0.5 items-center">
                        <Feather name="maximize-2" size={8} color="#FFFFFF" />
                      </View>
                    </>
                  ) : (
                    <Text className="text-primary font-black text-xl">
                      {(selectedUser?.profile?.name || selectedUser?.email || '?')
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  )}
                </TouchableOpacity>

                <View className="flex-1">
                  <Text className="font-black text-lg text-textPrimary" numberOfLines={1}>
                    {selectedUser?.profile?.name || 'Unnamed User'}
                  </Text>
                  <View className="flex-row items-center gap-1.5 mt-0.5 flex-wrap">
                    <Badge label={selectedUser?.role || 'USER'} variant="primary" />
                    <Badge
                      label={selectedUser?.active !== false ? 'Active' : 'Suspended'}
                      variant={selectedUser?.active !== false ? 'success' : 'error'}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedUser(null)}
                className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center border border-gray-200 ml-2"
              >
                <Feather name="x" size={18} color="#1A1A2E" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
            >
              {/* Account Details */}
              <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-4">
                <Text className="font-extrabold text-xs text-textSecondary uppercase tracking-wider mb-3">
                  Account Details
                </Text>
                {[
                  { icon: 'mail', label: 'Email', value: selectedUser?.email },
                  { icon: 'phone', label: 'Phone', value: selectedUser?.profile?.phone || 'Not provided' },
                  { icon: 'calendar', label: 'Registered', value: formatDate(selectedUser?.createdAt) },
                  { icon: 'hash', label: 'User ID', value: selectedUser?.id, mono: true },
                ].map(({ icon, label, value, mono }) => (
                  <View key={label} className="flex-row items-start gap-2 mb-2">
                    <Feather name={icon as any} size={13} color="#6B7280" className="mt-0.5" />
                    <Text className="text-textSecondary text-xs font-semibold w-20">{label}:</Text>
                    <Text
                      className={`text-textPrimary text-xs font-bold flex-1 ${mono ? 'font-mono' : ''}`}
                      numberOfLines={mono ? 1 : undefined}
                    >
                      {value}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Location */}
              {(selectedUser?.profile?.district || selectedUser?.profile?.town) && (
                <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-4">
                  <Text className="font-extrabold text-xs text-textSecondary uppercase tracking-wider mb-3">
                    Location
                  </Text>
                  <View className="flex-row items-center gap-2 mb-1.5">
                    <Feather name="map-pin" size={13} color="#6B7280" />
                    <Text className="text-textPrimary text-xs font-bold">
                      {[selectedUser?.profile?.town, selectedUser?.profile?.district]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  </View>
                  {selectedUser?.role === 'COOK' && selectedUser?.profile?.deliveryRadius && (
                    <View className="flex-row items-center gap-2">
                      <Feather name="target" size={13} color="#6B7280" />
                      <Text className="text-textSecondary text-xs font-semibold">Delivery Radius:</Text>
                      <Text className="text-textPrimary text-xs font-bold">
                        {selectedUser.profile.deliveryRadius} km
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Stats */}
              {(selectedUser?.stats?.totalOrders > 0 || selectedUser?.stats?.avgRating > 0) && (
                <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-4">
                  <Text className="font-extrabold text-xs text-textSecondary uppercase tracking-wider mb-3">
                    Platform Activity
                  </Text>
                  <View className="flex-row gap-3">
                    <View className="flex-1 bg-white rounded-xl p-3 items-center border border-gray-100">
                      <Text className="text-primary font-black text-lg">
                        {selectedUser?.stats?.totalOrders || 0}
                      </Text>
                      <Text className="text-textMuted text-[9px] font-bold uppercase">
                        {selectedUser?.role === 'CUSTOMER' ? 'Orders' : selectedUser?.role === 'RIDER' ? 'Deliveries' : 'Orders'}
                      </Text>
                    </View>
                    <View className="flex-1 bg-white rounded-xl p-3 items-center border border-gray-100">
                      <Text className="text-amber-500 font-black text-lg">
                        ⭐ {(selectedUser?.stats?.avgRating || 0).toFixed(1)}
                      </Text>
                      <Text className="text-textMuted text-[9px] font-bold uppercase">Avg Rating</Text>
                    </View>
                    {selectedUser?.role === 'COOK' && (
                      <View className="flex-1 bg-white rounded-xl p-3 items-center border border-gray-100">
                        <Text className="text-emerald-600 font-black text-base">
                          LKR {(selectedUser?.stats?.totalEarnings || 0).toFixed(0)}
                        </Text>
                        <Text className="text-textMuted text-[9px] font-bold uppercase">Earnings</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Cook-specific Info */}
              {selectedUser?.role === 'COOK' && (
                <View className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 mb-4">
                  <Text className="font-extrabold text-xs text-primary uppercase tracking-wider mb-3">
                    Cook Profile
                  </Text>
                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-xs text-textSecondary font-semibold">Verification:</Text>
                    <Badge
                      label={selectedUser?.profile?.hygieneVerified ? 'Verified ✓' : 'Not Verified'}
                      variant={selectedUser?.profile?.hygieneVerified ? 'success' : 'warning'}
                    />
                  </View>
                  {selectedUser?.profile?.bio && (
                    <View className="bg-white p-3 rounded-xl border border-orange-100 mt-2">
                      <Text className="text-[10px] text-textSecondary font-bold mb-1 uppercase">Bio</Text>
                      <Text className="text-xs text-textPrimary italic leading-relaxed">
                        &ldquo;{selectedUser.profile.bio}&rdquo;
                      </Text>
                    </View>
                  )}
                  {selectedUser?.profile?.kitchenPhotos?.length > 0 && (
                    <View className="mt-3">
                      <Text className="text-[10px] text-textSecondary font-bold mb-2 uppercase">
                        Kitchen Photos ({selectedUser.profile.kitchenPhotos.length})
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                        {selectedUser.profile.kitchenPhotos.map((url: string, i: number) => (
                          <TouchableOpacity
                            key={i}
                            onPress={() => setSelectedAvatarUrl(url)}
                            className="w-24 h-20 rounded-xl overflow-hidden bg-gray-100 border border-orange-100 mx-1"
                            activeOpacity={0.8}
                          >
                            <Image source={{ uri: url }} className="w-full h-full" resizeMode="cover" />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              {/* Rider-specific Info */}
              {selectedUser?.role === 'RIDER' && (
                <View className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-4">
                  <Text className="font-extrabold text-xs text-blue-600 uppercase tracking-wider mb-3">
                    Rider Profile
                  </Text>
                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-xs text-textSecondary font-semibold">Verification:</Text>
                    <Badge
                      label={selectedUser?.profile?.riderVerified ? 'Verified Rider ✓' : 'Pending'}
                      variant={selectedUser?.profile?.riderVerified ? 'success' : 'warning'}
                    />
                  </View>
                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-xs text-textSecondary font-semibold">Availability:</Text>
                    <Badge
                      label={selectedUser?.profile?.isAvailable ? 'Online 🟢' : 'Offline'}
                      variant={selectedUser?.profile?.isAvailable ? 'primary' : 'neutral'}
                    />
                  </View>
                  {selectedUser?.profile?.vehicleType && (
                    <View className="flex-row items-center gap-2 mb-2">
                      <Text className="text-xs text-textSecondary font-semibold">Vehicle:</Text>
                      <Text className="text-xs text-textPrimary font-bold">
                        {getVehicleIcon(selectedUser.profile.vehicleType)} {selectedUser.profile.vehicleType}
                        {selectedUser.profile.vehicleModel ? ` — ${selectedUser.profile.vehicleModel}` : ''}
                      </Text>
                    </View>
                  )}
                  {selectedUser?.profile?.vehiclePlate && (
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs text-textSecondary font-semibold">Plate:</Text>
                      <View className="bg-white px-2 py-0.5 rounded border border-blue-200">
                        <Text className="text-xs text-textPrimary font-black font-mono">
                          {selectedUser.profile.vehiclePlate}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View className="gap-2 mt-1">
                {selectedUser?.role === 'COOK' && !selectedUser?.profile?.hygieneVerified && selectedUser?.active !== false && (
                  <Button
                    title="VERIFY COOK ACCOUNT"
                    onPress={() => handleVerify(selectedUser.id)}
                    loading={actionLoading}
                    size="md"
                  />
                )}
                {selectedUser?.role === 'RIDER' && selectedUser?.active !== false && (
                  <Button
                    title={selectedUser?.profile?.riderVerified ? 'REVOKE RIDER VERIFICATION' : 'VERIFY RIDER'}
                    onPress={() => handleVerifyRider(selectedUser.id, selectedUser?.profile?.riderVerified)}
                    variant={selectedUser?.profile?.riderVerified ? 'outline' : 'primary'}
                    loading={actionLoading}
                    size="md"
                  />
                )}
                {selectedUser?.email !== currentUser?.email && (
                  <Button
                    title={selectedUser?.active !== false ? 'SUSPEND USER ACCOUNT' : 'ACTIVATE USER ACCOUNT'}
                    onPress={() => handleToggleActive(selectedUser.id, selectedUser.active !== false)}
                    variant="outline"
                    loading={actionLoading}
                    size="md"
                  />
                )}
                <Button
                  title="CLOSE"
                  onPress={() => setSelectedUser(null)}
                  variant="outline"
                  size="md"
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Image Viewer */}
      <Modal visible={!!selectedAvatarUrl} animationType="fade" transparent onRequestClose={() => setSelectedAvatarUrl(null)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSelectedAvatarUrl(null)}
          className="flex-1 bg-black/90 justify-center items-center p-6"
        >
          <TouchableOpacity
            onPress={() => setSelectedAvatarUrl(null)}
            className="absolute top-12 right-6 w-11 h-11 rounded-full bg-white/20 items-center justify-center z-50 border border-white/30"
          >
            <Feather name="x" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {selectedAvatarUrl && (
            <View className="w-80 h-80 rounded-3xl overflow-hidden border-2 border-white/20 bg-black">
              <Image
                source={{ uri: selectedAvatarUrl }}
                className="w-full h-full"
                resizeMode="contain"
              />
            </View>
          )}
          <Text className="text-white/60 text-xs font-bold mt-5 tracking-wide uppercase">
            Tap anywhere to close
          </Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
