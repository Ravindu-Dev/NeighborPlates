import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';

export const AnalyticsScreen: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/admin/analytics');
      setStats(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-elevated">
        <ActivityIndicator size="large" color="#1A1A2E" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-elevated p-6">
      <Text className="text-textPrimary text-xl font-bold mb-6">Platform Statistics</Text>

      <View className="flex-row justify-between mb-4">
        <Card className="flex-1 mr-3 p-4" bordered>
          <Text className="text-textMuted text-[9px] font-bold uppercase">TOTAL USERS</Text>
          <Text className="text-primary font-black text-2xl mt-1">{stats?.totalUsers}</Text>
        </Card>
        <Card className="flex-1 p-4" bordered>
          <Text className="text-textMuted text-[9px] font-bold uppercase">TOTAL ORDERS</Text>
          <Text className="text-primary font-black text-2xl mt-1">{stats?.totalOrders}</Text>
        </Card>
      </View>

      <View className="flex-row justify-between mb-4">
        <Card className="flex-1 mr-3 p-4" bordered>
          <Text className="text-textMuted text-[9px] font-bold uppercase">TOTAL REVENUE</Text>
          <Text className="text-secondary font-black text-lg mt-1">LKR {stats?.totalRevenue.toFixed(0)}</Text>
        </Card>
        <Card className="flex-1 p-4" bordered>
          <Text className="text-textMuted text-[9px] font-bold uppercase">TOTAL COMMISSION</Text>
          <Text className="text-secondary font-black text-lg mt-1">LKR {stats?.totalCommission.toFixed(0)}</Text>
        </Card>
      </View>

      <Card className="p-5 mt-2" bordered>
        <Text className="text-textMuted text-[10px] font-bold uppercase mb-3">COHORT SPLIT</Text>
        <View className="flex-row justify-between border-b border-gray-50 pb-2 mb-2">
          <Text className="text-textSecondary text-xs">Registered Customers</Text>
          <Text className="text-textPrimary font-bold text-xs">{stats?.totalCustomers}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-textSecondary text-xs">Registered Cooks</Text>
          <Text className="text-textPrimary font-bold text-xs">{stats?.totalCooks}</Text>
        </View>
      </Card>
    </View>
  );
};
