import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { Feather } from '@expo/vector-icons';

export const UserManagementScreen: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'cooks' | 'customers' | 'riders'>('cooks');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch users list.');
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

  const handleVerify = async (userId: string) => {
    try {
      await api.put(`/api/admin/users/${userId}/verify`);
      Alert.alert('Success', 'Cook hygiene certified successfully.');
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to verify cook.');
    }
  };

  const handleVerifyRider = async (userId: string, currentlyVerified: boolean) => {
    try {
      await api.put(`/api/admin/riders/${userId}/verify`);
      Alert.alert('Success', `Rider verification ${currentlyVerified ? 'revoked' : 'approved'} successfully.`);
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update rider verification status.');
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    Alert.alert(
      currentActive ? 'Suspend Account' : 'Reactivate Account',
      `Are you sure you want to ${currentActive ? 'suspend' : 'reactivate'} this user's account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentActive ? 'Suspend' : 'Reactivate',
          style: currentActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.put(`/api/admin/users/${userId}/toggle-active`);
              Alert.alert('Success', `User account ${currentActive ? 'suspended' : 'reactivated'} successfully.`);
              fetchUsers();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to update user account status.');
            }
          }
        }
      ]
    );
  };

  const cooks = users.filter((u: any) => u.role === 'COOK');
  const customers = users.filter((u: any) => u.role === 'CUSTOMER');
  const riders = users.filter((u: any) => u.role === 'RIDER');
  const displayData = activeTab === 'cooks' ? cooks : activeTab === 'customers' ? customers : riders;

  const getVehicleIcon = (type?: string) => {
    switch (type) {
      case 'Motorcycle': return '🛵';
      case 'Bicycle': return '🚲';
      case 'Car': return '🚗';
      case 'Walking': return '🚶';
      default: return '🛵';
    }
  };

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* Tabs */}
      <View className="flex-row border-b border-gray-100 bg-white">
        <TouchableOpacity
          onPress={() => setActiveTab('cooks')}
          className={`flex-1 py-4 items-center border-b-2 ${activeTab === 'cooks' ? 'border-primary' : 'border-transparent'}`}
        >
          <Text className={`font-bold text-sm ${activeTab === 'cooks' ? 'text-primary' : 'text-textSecondary'}`}>
            Cooks ({cooks.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('customers')}
          className={`flex-1 py-4 items-center border-b-2 ${activeTab === 'customers' ? 'border-primary' : 'border-transparent'}`}
        >
          <Text className={`font-bold text-sm ${activeTab === 'customers' ? 'text-primary' : 'text-textSecondary'}`}>
            Customers ({customers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('riders')}
          className={`flex-1 py-4 items-center border-b-2 ${activeTab === 'riders' ? 'border-primary' : 'border-transparent'}`}
        >
          <Text className={`font-bold text-sm ${activeTab === 'riders' ? 'text-primary' : 'text-textSecondary'}`}>
            Riders ({riders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1A1A2E" />
        </View>
      ) : displayData.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6">
          <Feather name="users" size={48} color="#9CA3AF" />
          <Text className="text-textMuted text-base font-semibold text-center mt-4">
            No registered {activeTab} found
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF6B35']} />
          }
          renderItem={({ item }) => (
            <Card className="mb-4">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-textPrimary font-extrabold text-sm">{item.profile?.name || 'Unnamed'}</Text>
                  <Text className="text-textSecondary text-xs mt-0.5">{item.email}</Text>
                  <Text className="text-textSecondary text-xs mt-0.5">Phone: {item.profile?.phone || 'None'}</Text>
                  {item.role === 'RIDER' && (
                    <Text className="text-textPrimary font-semibold text-xs mt-1">
                      Vehicle: {getVehicleIcon(item.profile?.vehicleType)} {item.profile?.vehicleType || 'Not specified'}
                    </Text>
                  )}
                </View>
                <View className="items-end gap-1.5">
                  <Badge
                    label={item.active ? "Active" : "Suspended"}
                    variant={item.active ? "success" : "error"}
                  />
                  {item.role === 'COOK' && (
                    <Badge
                      label={item.profile?.hygieneVerified ? "Certified" : "Unverified"}
                      variant={item.profile?.hygieneVerified ? "success" : "warning"}
                    />
                  )}
                  {item.role === 'RIDER' && (
                    <>
                      <Badge
                        label={item.profile?.riderVerified ? "Verified Rider" : "Pending Approval"}
                        variant={item.profile?.riderVerified ? "success" : "warning"}
                      />
                      <Badge
                        label={item.profile?.isAvailable ? "Online 🟢" : "Offline ⚪"}
                        variant={item.profile?.isAvailable ? "primary" : "neutral"}
                      />
                    </>
                  )}
                </View>
              </View>

              {item.role === 'COOK' && item.profile?.bio && (
                <Text className="text-textMuted text-[11px] italic mt-2">
                  Bio: "{item.profile.bio}"
                </Text>
              )}

              <View className="flex-row gap-3 mt-4">
                {item.role === 'COOK' && !item.profile?.hygieneVerified && item.active && (
                  <Button
                    title="CERTIFY HYGIENE"
                    onPress={() => handleVerify(item.id)}
                    size="sm"
                    className="flex-1"
                  />
                )}
                {item.role === 'RIDER' && item.active && (
                  <Button
                    title={item.profile?.riderVerified ? "REVOKE RIDER" : "VERIFY RIDER"}
                    onPress={() => handleVerifyRider(item.id, item.profile?.riderVerified)}
                    variant={item.profile?.riderVerified ? "outline" : "primary"}
                    size="sm"
                    className="flex-1"
                  />
                )}
                {item.email !== currentUser?.email && (
                  <Button
                    title={item.active ? "SUSPEND USER" : "ACTIVATE USER"}
                    onPress={() => handleToggleActive(item.id, item.active)}
                    variant={item.active ? "outline" : "primary"}
                    size="sm"
                    className="flex-1"
                  />
                )}
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
};
