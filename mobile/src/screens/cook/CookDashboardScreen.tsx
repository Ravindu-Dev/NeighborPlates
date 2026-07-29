import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const CookDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const profRes = await api.get('/api/users/profile');
      setProfile(profRes.data);

      const ordRes = await api.get('/api/orders/my');
      setOrders(ordRes.data.filter((o: any) => o.status === 'PLACED' || o.status === 'ACCEPTED' || o.status === 'PREPARING'));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-elevated">
        <ActivityIndicator size="large" color="#2D6A4F" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-elevated px-4 pt-4">
      {/* Cook Welcome Header */}
      <View className="mb-6 flex-row justify-between items-center">
        <View>
          <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider">KITCHEN STATUS</Text>
          <Text className="text-textPrimary font-extrabold text-sm mt-0.5">
            {profile?.profile?.name}'s Kitchen 🍳
          </Text>
        </View>
        <Badge
          label={profile?.profile?.hygieneVerified ? "Verified Cook" : "Verification Pending"}
          variant={profile?.profile?.hygieneVerified ? "success" : "warning"}
        />
      </View>

      {/* Summary Row */}
      <View className="flex-row justify-between mb-6">
        <Card className="flex-1 mr-3 p-4 items-center" bordered>
          <Text className="text-textMuted text-[9px] font-bold uppercase">TOTAL ORDERS</Text>
          <Text className="text-secondary font-black text-2xl mt-1">{profile?.stats?.totalOrders}</Text>
        </Card>
        <Card className="flex-1 p-4 items-center" bordered>
          <Text className="text-textMuted text-[9px] font-bold uppercase">TOTAL EARNINGS</Text>
          <Text className="text-secondary font-black text-xl mt-1">LKR {profile?.stats?.totalEarnings.toFixed(0)}</Text>
        </Card>
      </View>

      {/* Active Kitchen Queue */}
      <Text className="text-textPrimary font-bold text-base mb-4">Active Orders Queue</Text>
      {orders.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-textMuted text-base font-semibold text-center mb-1">Queue is empty</Text>
          <Text className="text-textMuted text-xs text-center">New incoming orders will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Card
              onPress={() => navigation.navigate('Orders')}
              className="mb-4 border-l-4 border-l-secondary"
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-textPrimary font-extrabold text-sm">{item.orderNumber}</Text>
                <Badge label={item.status} variant="secondary" />
              </View>
              <Text className="text-textSecondary text-xs">Customer: {item.customerName}</Text>
              <Text className="text-textMuted text-[10px] mt-1">
                {item.items.map((meal: any) => `${meal.name} (x${meal.quantity})`).join(', ')}
              </Text>
            </Card>
          )}
        />
      )}
    </View>
  );
};
