import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const UserManagementScreen: React.FC = () => {
  const [cooks, setCooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/admin/users');
      // Filter out only registered cooks
      const filtered = response.data.filter((u: any) => u.role === 'COOK');
      setCooks(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
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

  return (
    <View className="flex-1 bg-surface-elevated px-4 pt-4">
      <Text className="text-textPrimary text-xl font-bold mb-4">Verify Cooks Hygiene</Text>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1A1A2E" />
        </View>
      ) : cooks.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-textMuted text-base font-semibold text-center">No registered cooks found</Text>
        </View>
      ) : (
        <FlatList
          data={cooks}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Card className="mb-4">
              <View className="flex-row justify-between items-start mb-2">
                <View>
                  <Text className="text-textPrimary font-extrabold text-sm">{item.profile.name}</Text>
                  <Text className="text-textSecondary text-xs mt-0.5">{item.email}</Text>
                </View>
                <Badge
                  label={item.profile.hygieneVerified ? "Certified" : "Unverified"}
                  variant={item.profile.hygieneVerified ? "success" : "warning"}
                />
              </View>

              <Text className="text-textMuted text-[11px] italic mt-2">
                Bio: "{item.profile.bio || 'None'}"
              </Text>

              {!item.profile.hygieneVerified && (
                <TouchableOpacity
                  onPress={() => handleVerify(item.id)}
                  className="bg-primary rounded-xl py-2.5 items-center justify-center mt-4 active:opacity-85"
                >
                  <Text className="text-white font-bold text-xs tracking-wider">CERTIFY HYGIENE</Text>
                </TouchableOpacity>
              )}
            </Card>
          )}
        />
      )}
    </View>
  );
};
