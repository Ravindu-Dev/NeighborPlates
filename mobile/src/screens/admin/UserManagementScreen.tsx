import React, { useEffect, useState } from 'react';
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
  Image
} from 'react-native';
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

  // Selected user state for detail modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  // Fullscreen image viewer state
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/admin/users');
      setUsers(response.data);
      // If modal is open, update selectedUser with latest data
      if (selectedUser) {
        const updated = response.data.find((u: any) => u.id === selectedUser.id);
        if (updated) setSelectedUser(updated);
      }
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
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => setSelectedUser(item)}
                className="flex-row justify-between items-start mb-2"
              >
                <View className="flex-1 mr-2">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-textPrimary font-extrabold text-base underline decoration-primary">
                      {item.profile?.name || 'Unnamed'}
                    </Text>
                    <Feather name="info" size={14} color="#FF6B35" />
                  </View>
                  <Text className="text-textSecondary text-xs mt-0.5">{item.email}</Text>
                  <Text className="text-textSecondary text-xs mt-0.5">Phone: {item.profile?.phone || 'None'}</Text>
                  {item.role === 'RIDER' && (
                    <Text className="text-textPrimary font-semibold text-xs mt-1">
                      Vehicle: {getVehicleIcon(item.profile?.vehicleType)} {item.profile?.vehicleType || 'Not specified'}
                    </Text>
                  )}
                  <Text className="text-primary text-[10px] font-bold mt-1 uppercase tracking-wider">
                    👉 Tap to view full profile
                  </Text>
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
              </TouchableOpacity>

              {item.role === 'COOK' && item.profile?.bio && (
                <Text className="text-textMuted text-[11px] italic mt-2">
                  Bio: "{item.profile.bio}"
                </Text>
              )}

              <View className="flex-row gap-3 mt-4 border-t border-gray-100 pt-3">
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

      {/* User Details Modal */}
      <Modal
        visible={!!selectedUser}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedUser(null)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[90%] p-6 shadow-2xl">
            {/* Header */}
            <View className="flex-row justify-between items-center pb-4 border-b border-gray-150">
              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!selectedUser?.profile?.avatarUrl}
                  onPress={() => {
                    if (selectedUser?.profile?.avatarUrl) {
                      setSelectedAvatarUrl(selectedUser.profile.avatarUrl);
                    }
                  }}
                  className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center border-2 border-primary/30 overflow-hidden relative shadow-sm"
                >
                  {selectedUser?.profile?.avatarUrl ? (
                    <>
                      <Image 
                        source={{ uri: selectedUser.profile.avatarUrl }} 
                        className="w-full h-full" 
                        resizeMode="cover"
                      />
                      <View className="absolute bottom-0 inset-x-0 bg-black/50 py-0.5 items-center justify-center">
                        <Feather name="maximize-2" size={9} color="#FFFFFF" />
                      </View>
                    </>
                  ) : (
                    <Text className="text-primary font-black text-xl">
                      {selectedUser?.profile?.name ? selectedUser.profile.name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  )}
                </TouchableOpacity>
                <View>
                  <Text className="font-black text-lg text-textPrimary">
                    {selectedUser?.profile?.name || 'Unnamed User'}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <Badge 
                      label={selectedUser?.role || 'USER'} 
                      variant="primary" 
                    />
                    <Badge 
                      label={selectedUser?.active ? "Active" : "Suspended"} 
                      variant={selectedUser?.active ? "success" : "error"} 
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedUser(null)}
                className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center border border-gray-200"
              >
                <Feather name="x" size={18} color="#1A1A2E" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView showsVerticalScrollIndicator={false} className="py-4">
              {/* Account Overview */}
              <View className="bg-surface-elevated p-4 rounded-2xl border border-gray-150 mb-4">
                <Text className="font-extrabold text-xs text-textSecondary uppercase tracking-wider mb-2.5">
                  Account Details
                </Text>
                
                <View className="flex-row items-center gap-2 mb-2">
                  <Feather name="mail" size={14} color="#6B7280" />
                  <Text className="text-textSecondary text-xs font-semibold">Email:</Text>
                  <Text className="text-textPrimary text-xs font-bold flex-1">{selectedUser?.email}</Text>
                </View>

                <View className="flex-row items-center gap-2 mb-2">
                  <Feather name="phone" size={14} color="#6B7280" />
                  <Text className="text-textSecondary text-xs font-semibold">Phone:</Text>
                  <Text className="text-textPrimary text-xs font-bold flex-1">
                    {selectedUser?.profile?.phone || 'Not provided'}
                  </Text>
                </View>

                <View className="flex-row items-center gap-2">
                  <Feather name="hash" size={14} color="#6B7280" />
                  <Text className="text-textSecondary text-xs font-semibold">User ID:</Text>
                  <Text className="text-textPrimary text-xs font-mono flex-1" numberOfLines={1}>
                    {selectedUser?.id}
                  </Text>
                </View>
              </View>

              {/* Address & Location */}
              <View className="bg-surface-elevated p-4 rounded-2xl border border-gray-150 mb-4">
                <Text className="font-extrabold text-xs text-textSecondary uppercase tracking-wider mb-2.5">
                  Address & Location
                </Text>

                <View className="flex-row items-start gap-2 mb-2">
                  <Feather name="map-pin" size={14} color="#6B7280" className="mt-0.5" />
                  <Text className="text-textSecondary text-xs font-semibold">Street:</Text>
                  <Text className="text-textPrimary text-xs font-bold flex-1">
                    {selectedUser?.profile?.streetAddress || 'Not specified'}
                  </Text>
                </View>

                <View className="flex-row items-center gap-2 mb-2">
                  <Feather name="globe" size={14} color="#6B7280" />
                  <Text className="text-textSecondary text-xs font-semibold">City / Zip:</Text>
                  <Text className="text-textPrimary text-xs font-bold flex-1">
                    {[selectedUser?.profile?.city, selectedUser?.profile?.zipCode].filter(Boolean).join(', ') || 'Not specified'}
                  </Text>
                </View>

                {(selectedUser?.profile?.latitude || selectedUser?.profile?.longitude) && (
                  <View className="flex-row items-center gap-2">
                    <Feather name="navigation" size={14} color="#6B7280" />
                    <Text className="text-textSecondary text-xs font-semibold">Coordinates:</Text>
                    <Text className="text-textPrimary text-xs font-mono flex-1">
                      {selectedUser?.profile?.latitude}, {selectedUser?.profile?.longitude}
                    </Text>
                  </View>
                )}
              </View>

              {/* Role Specific Details */}
              {selectedUser?.role === 'COOK' && (
                <View className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 mb-4">
                  <Text className="font-extrabold text-xs text-primary uppercase tracking-wider mb-2.5">
                    🍳 Cook Kitchen Profile
                  </Text>

                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-xs text-textSecondary font-semibold">Kitchen Name:</Text>
                    <Text className="text-xs text-textPrimary font-extrabold flex-1">
                      {selectedUser?.profile?.kitchenName || 'Not configured'}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-xs text-textSecondary font-semibold">Hygiene Certification:</Text>
                    <Badge
                      label={selectedUser?.profile?.hygieneVerified ? "Certified ✅" : "Unverified ⏳"}
                      variant={selectedUser?.profile?.hygieneVerified ? "success" : "warning"}
                    />
                  </View>

                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-xs text-textSecondary font-semibold">Rating:</Text>
                    <Text className="text-xs text-textPrimary font-bold">
                      ⭐ {selectedUser?.profile?.rating || '0.0'} ({selectedUser?.profile?.ratingCount || 0} reviews)
                    </Text>
                  </View>

                  {selectedUser?.profile?.bio && (
                    <View className="mt-1 bg-white p-3 rounded-xl border border-orange-100">
                      <Text className="text-[11px] text-textSecondary font-bold mb-1">Bio:</Text>
                      <Text className="text-xs text-textPrimary italic">"{selectedUser.profile.bio}"</Text>
                    </View>
                  )}
                </View>
              )}

              {selectedUser?.role === 'RIDER' && (
                <View className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-4">
                  <Text className="font-extrabold text-xs text-blue-600 uppercase tracking-wider mb-2.5">
                    🚴 Rider Vehicle & License Info
                  </Text>

                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-xs text-textSecondary font-semibold">Vehicle Type:</Text>
                    <Text className="text-xs text-textPrimary font-extrabold">
                      {getVehicleIcon(selectedUser?.profile?.vehicleType)} {selectedUser?.profile?.vehicleType || 'Not specified'}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-xs text-textSecondary font-semibold">Vehicle Number:</Text>
                    <Text className="text-xs text-textPrimary font-mono font-bold">
                      {selectedUser?.profile?.vehicleNumber || 'Not provided'}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-xs text-textSecondary font-semibold">License Number:</Text>
                    <Text className="text-xs text-textPrimary font-mono font-bold">
                      {selectedUser?.profile?.licenseNumber || 'Not provided'}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <Text className="text-xs text-textSecondary font-semibold">Verification:</Text>
                    <Badge
                      label={selectedUser?.profile?.riderVerified ? "Verified Rider ✅" : "Pending ⏳"}
                      variant={selectedUser?.profile?.riderVerified ? "success" : "warning"}
                    />
                  </View>
                </View>
              )}

              {/* Action Buttons in Modal */}
              <View className="gap-2 mt-2">
                {selectedUser?.role === 'COOK' && !selectedUser?.profile?.hygieneVerified && selectedUser?.active && (
                  <Button
                    title="CERTIFY HYGIENE"
                    onPress={() => handleVerify(selectedUser.id)}
                    size="md"
                    className="w-full"
                  />
                )}
                {selectedUser?.role === 'RIDER' && selectedUser?.active && (
                  <Button
                    title={selectedUser?.profile?.riderVerified ? "REVOKE RIDER VERIFICATION" : "VERIFY RIDER"}
                    onPress={() => handleVerifyRider(selectedUser.id, selectedUser?.profile?.riderVerified)}
                    variant={selectedUser?.profile?.riderVerified ? "outline" : "primary"}
                    size="md"
                    className="w-full"
                  />
                )}
                {selectedUser?.email !== currentUser?.email && (
                  <Button
                    title={selectedUser?.active ? "SUSPEND USER ACCOUNT" : "ACTIVATE USER ACCOUNT"}
                    onPress={() => handleToggleActive(selectedUser.id, selectedUser.active)}
                    variant={selectedUser?.active ? "outline" : "primary"}
                    size="md"
                    className="w-full"
                  />
                )}
                <Button
                  title="CLOSE DETAILS"
                  onPress={() => setSelectedUser(null)}
                  variant="outline"
                  size="md"
                  className="w-full mt-1"
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Avatar Preview Modal */}
      <Modal
        visible={!!selectedAvatarUrl}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedAvatarUrl(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSelectedAvatarUrl(null)}
          className="flex-1 bg-black/90 justify-center items-center p-6 relative"
        >
          <TouchableOpacity
            onPress={() => setSelectedAvatarUrl(null)}
            className="absolute top-12 right-6 w-11 h-11 rounded-full bg-white/20 items-center justify-center z-50 border border-white/30"
          >
            <Feather name="x" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {selectedAvatarUrl && (
            <View className="w-80 h-80 rounded-3xl overflow-hidden border-2 border-white/20 bg-black shadow-2xl items-center justify-center">
              <Image
                source={{ uri: selectedAvatarUrl }}
                className="w-full h-full"
                resizeMode="contain"
              />
            </View>
          )}

          <Text className="text-white/70 text-xs font-bold mt-6 tracking-wide uppercase">
            Tap anywhere to close
          </Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

