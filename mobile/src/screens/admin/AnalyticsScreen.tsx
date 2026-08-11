import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, Alert,
  TouchableOpacity, RefreshControl, FlatList
} from 'react-native';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Feather } from '@expo/vector-icons';

export const AnalyticsScreen: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [payoutSummary, setPayoutSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settlingUserId, setSettlingUserId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<'ALL' | 'COOK' | 'RIDER'>('ALL');

  const fetchData = async () => {
    try {
      const [statsRes, payoutRes] = await Promise.all([
        api.get('/api/admin/analytics'),
        api.get('/api/admin/payouts/summary'),
      ]);
      setStats(statsRes.data);
      setPayoutSummary(payoutRes.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load financial & analytics data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSettlePayout = (userId: string, userName: string, amount: number, role: string) => {
    Alert.alert(
      'Settle Payout',
      `Are you sure you want to process a payout settlement of LKR ${amount.toFixed(2)} for ${role.toLowerCase()} "${userName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle Now',
          style: 'default',
          onPress: async () => {
            setSettlingUserId(userId);
            try {
              await api.post(`/api/admin/payouts/settle/${userId}`);
              Alert.alert('Success', `Payout of LKR ${amount.toFixed(2)} settled for ${userName}.`);
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to settle payout.');
            } finally {
              setSettlingUserId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-elevated">
        <ActivityIndicator size="large" color="#1A1A2E" />
      </View>
    );
  }

  const userBalances = payoutSummary?.userBalances || [];
  const filteredBalances = userBalances.filter((b: any) => {
    if (filterRole === 'ALL') return true;
    return b.role === filterRole;
  });

  return (
    <ScrollView
      className="flex-1 bg-surface-elevated"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF6B35']} />
      }
    >
      <View className="p-5">
        <Text className="text-textPrimary text-xl font-black mb-4">Financials & Settlements Hub</Text>

        {/* Top Metric Grid */}
        <View className="flex-row justify-between mb-3">
          <Card className="flex-1 mr-2 p-3.5" bordered>
            <Text className="text-textMuted text-[9px] font-bold uppercase">GROSS GMV</Text>
            <Text className="text-primary font-black text-lg mt-0.5">
              LKR {(stats?.totalRevenue || 0).toFixed(0)}
            </Text>
          </Card>
          <Card className="flex-1 ml-2 p-3.5" bordered>
            <Text className="text-textMuted text-[9px] font-bold uppercase">COMMISSION (10%)</Text>
            <Text className="text-secondary font-black text-lg mt-0.5">
              LKR {(stats?.totalCommission || 0).toFixed(0)}
            </Text>
          </Card>
        </View>

        {/* Pending Payout Badges */}
        <View className="flex-row justify-between mb-5">
          <Card className="flex-1 mr-2 p-3.5 bg-amber-50/60 border-amber-100" bordered>
            <Text className="text-amber-800 text-[9px] font-bold uppercase">PENDING COOK PAYOUTS</Text>
            <Text className="text-amber-700 font-extrabold text-base mt-0.5">
              LKR {(payoutSummary?.totalPendingCookPayouts || 0).toFixed(2)}
            </Text>
          </Card>
          <Card className="flex-1 ml-2 p-3.5 bg-indigo-50/60 border-indigo-100" bordered>
            <Text className="text-indigo-800 text-[9px] font-bold uppercase">PENDING RIDER PAYOUTS</Text>
            <Text className="text-indigo-700 font-extrabold text-base mt-0.5">
              LKR {(payoutSummary?.totalPendingRiderPayouts || 0).toFixed(2)}
            </Text>
          </Card>
        </View>

        {/* Section Title & Filter Tabs */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-textPrimary font-extrabold text-base">User Payout Balances</Text>
          <View className="flex-row bg-gray-100 rounded-lg p-0.5">
            {(['ALL', 'COOK', 'RIDER'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setFilterRole(r)}
                className={`px-2.5 py-1 rounded-md ${filterRole === r ? 'bg-white shadow-xs' : ''}`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    filterRole === r ? 'text-textPrimary' : 'text-textMuted'
                  }`}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {filteredBalances.length === 0 ? (
          <Card className="p-6 items-center justify-center mb-6">
            <Feather name="check-circle" size={36} color="#10B981" />
            <Text className="text-textPrimary font-bold text-sm mt-3">All Payouts Settled!</Text>
            <Text className="text-textMuted text-xs text-center mt-1">
              No pending payouts found for the selected filter.
            </Text>
          </Card>
        ) : (
          filteredBalances.map((item: any) => {
            const hasPending = item.pendingBalance > 0;
            return (
              <Card key={item.userId} className="mb-3 p-4">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 mr-2">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-textPrimary font-extrabold text-sm">{item.name}</Text>
                      <Badge
                        label={item.role}
                        variant={item.role === 'COOK' ? 'warning' : 'primary'}
                      />
                    </View>
                    <Text className="text-textSecondary text-xs mt-0.5">{item.email}</Text>
                    {item.phone && (
                      <Text className="text-textMuted text-[11px] mt-0.5">Phone: {item.phone}</Text>
                    )}
                  </View>
                  <View className="items-end">
                    <Text className="text-textMuted text-[10px] font-semibold uppercase">Pending</Text>
                    <Text
                      className={`font-black text-base ${
                        hasPending ? 'text-primary' : 'text-emerald-600'
                      }`}
                    >
                      LKR {item.pendingBalance.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between items-center pt-2 border-t border-gray-100 mt-2">
                  <Text className="text-textMuted text-xs">
                    Lifetime: <Text className="font-bold text-textPrimary">LKR {item.totalLifetimeEarnings.toFixed(2)}</Text>
                  </Text>
                  {hasPending ? (
                    <Button
                      title="SETTLE PAYOUT"
                      onPress={() =>
                        handleSettlePayout(
                          item.userId,
                          item.name,
                          item.pendingBalance,
                          item.role
                        )
                      }
                      loading={settlingUserId === item.userId}
                      size="sm"
                      className="bg-emerald-600 border-emerald-600 px-3 py-1.5"
                    />
                  ) : (
                    <Badge label="Settled ✓" variant="success" />
                  )}
                </View>
              </Card>
            );
          })
        )}

        {/* Platform Overview Summary */}
        <Card className="p-4 mt-2 mb-6" bordered>
          <Text className="text-textMuted text-[10px] font-bold uppercase mb-3">PLATFORM COHORT SUMMARY</Text>
          <View className="flex-row justify-between border-b border-gray-50 pb-2 mb-2">
            <Text className="text-textSecondary text-xs">Total Registered Users</Text>
            <Text className="text-textPrimary font-bold text-xs">{stats?.totalUsers}</Text>
          </View>
          <View className="flex-row justify-between border-b border-gray-50 pb-2 mb-2">
            <Text className="text-textSecondary text-xs">Customers</Text>
            <Text className="text-textPrimary font-bold text-xs">{stats?.totalCustomers}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-textSecondary text-xs">Home Cooks</Text>
            <Text className="text-textPrimary font-bold text-xs">{stats?.totalCooks}</Text>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
};

