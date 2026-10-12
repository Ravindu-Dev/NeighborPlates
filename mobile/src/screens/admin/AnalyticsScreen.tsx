import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, Alert,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { Feather } from '@expo/vector-icons';
import { AdminHeader } from '../../components/admin/AdminHeader';

const formatLKR = (amount: number) => {
  if (amount >= 1000000) return `LKR ${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `LKR ${(amount / 1000).toFixed(1)}K`;
  return `LKR ${amount.toFixed(2)}`;
};

const formatLKRFull = (amount: number) =>
  `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface StatItemProps {
  icon: string;
  iconColor: string;
  bgColor: string;
  label: string;
  value: string | number;
  sub?: string;
}

const StatItem: React.FC<StatItemProps> = ({ icon, iconColor, bgColor, label, value, sub }) => (
  <View className="flex-1 bg-white rounded-2xl p-3.5 border border-gray-100 items-center min-h-[90px] justify-center">
    <View
      className={`w-9 h-9 rounded-full items-center justify-center mb-2`}
      style={{ backgroundColor: bgColor }}
    >
      <Text style={{ fontSize: 16 }}>{icon}</Text>
    </View>
    <Text
      className="font-black text-lg text-textPrimary"
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {value}
    </Text>
    <Text className="text-textMuted text-[9px] font-bold uppercase text-center mt-0.5">
      {label}
    </Text>
    {sub ? (
      <Text className="text-textMuted text-[9px] text-center mt-0.5">{sub}</Text>
    ) : null}
  </View>
);

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
      Alert.alert('Error', 'Failed to load analytics and payout data.');
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
    if (amount <= 0) {
      Alert.alert('Nothing to Settle', `${userName} has no pending balance to settle.`);
      return;
    }
    Alert.alert(
      'Confirm Payout Settlement',
      `Record a settlement of ${formatLKRFull(amount)} for ${role.toLowerCase()} "${userName}"?\n\nNote: This marks the payout as settled in the system. Ensure the actual transfer has been made externally before confirming.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle Now',
          onPress: async () => {
            setSettlingUserId(userId);
            try {
              await api.post(`/api/admin/payouts/settle/${userId}`);
              await fetchData();
              Alert.alert('Settled', `Payout of ${formatLKRFull(amount)} recorded as settled for ${userName}.`);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to record settlement.');
            } finally {
              setSettlingUserId(null);
            }
          },
        },
      ]
    );
  };

  const userBalances = payoutSummary?.userBalances || [];
  const filteredBalances = userBalances
    .filter((b: any) => filterRole === 'ALL' || b.role === filterRole)
    .sort((a: any, b: any) => b.pendingBalance - a.pendingBalance);

  const totalPending = (payoutSummary?.totalPendingCookPayouts || 0) + (payoutSummary?.totalPendingRiderPayouts || 0);

  const renderSkeleton = () => (
    <View className="p-5">
      <SkeletonLoader height={24} width="60%" className="mb-4" />
      <View className="flex-row gap-3 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <View key={i} className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
            <SkeletonLoader height={36} width={36} borderRadius={18} className="mb-3" />
            <SkeletonLoader height={20} width="70%" className="mb-1" />
            <SkeletonLoader height={10} width="90%" />
          </View>
        ))}
      </View>
      {[1, 2, 3].map((i) => (
        <View key={i} className="bg-white rounded-2xl p-4 border border-gray-100 mb-3">
          <SkeletonLoader height={14} width="50%" className="mb-2" />
          <SkeletonLoader height={11} width="70%" />
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-surface-elevated">
        <AdminHeader title="Analytics & Payouts" />
        {renderSkeleton()}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-elevated">
      <AdminHeader
        title="Analytics & Payouts"
        subtitle="Real-time platform performance"
        rightAction={{ icon: 'refresh-cw', onPress: handleRefresh }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF6B35']} tintColor="#FF6B35" />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {/* Platform Overview Header */}
        <View className="bg-primary rounded-3xl p-5 mb-4">
          <Text className="text-white/70 text-xs font-bold uppercase mb-1 tracking-wider">Gross Merchandise Value</Text>
          <Text className="text-white text-3xl font-black mb-1">
            {formatLKR(stats?.totalRevenue || 0)}
          </Text>
          <Text className="text-white/60 text-xs">
            Platform commission earned: {formatLKRFull(stats?.totalCommission || 0)}
          </Text>
          <View className="flex-row items-center mt-3 bg-white/10 rounded-xl px-3 py-2">
            <Feather name="info" size={12} color="rgba(255,255,255,0.7)" />
            <Text className="text-white/70 text-[10px] ml-2 flex-1 leading-relaxed">
              GMV = total order value across all statuses. Commission = platform fee from completed orders.
            </Text>
          </View>
        </View>

        {/* 4-Column User Stats */}
        <Text className="text-textSecondary text-[10px] font-bold uppercase tracking-wider mb-2">
          Platform Users
        </Text>
        <View className="flex-row gap-2 mb-4">
          <StatItem
            icon="👥"
            iconColor="#FF6B35"
            bgColor="#FFF3EE"
            label="Total Users"
            value={stats?.totalUsers || 0}
          />
          <StatItem
            icon="🛒"
            iconColor="#3B82F6"
            bgColor="#EFF6FF"
            label="Customers"
            value={stats?.totalCustomers || 0}
          />
          <StatItem
            icon="👨‍🍳"
            iconColor="#10B981"
            bgColor="#ECFDF5"
            label="Cooks"
            value={stats?.totalCooks || 0}
            sub={stats?.pendingCookVerifications > 0 ? `${stats.pendingCookVerifications} pending` : undefined}
          />
          <StatItem
            icon="🛵"
            iconColor="#8B5CF6"
            bgColor="#F5F3FF"
            label="Riders"
            value={stats?.totalRiders || 0}
            sub={stats?.pendingRiderVerifications > 0 ? `${stats.pendingRiderVerifications} pending` : undefined}
          />
        </View>

        {/* Orders Stats */}
        <Text className="text-textSecondary text-[10px] font-bold uppercase tracking-wider mb-2">
          Order Activity
        </Text>
        <View className="flex-row gap-2 mb-4">
          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-textMuted text-[9px] font-bold uppercase">Total Orders</Text>
              <Feather name="shopping-bag" size={14} color="#FF6B35" />
            </View>
            <Text className="text-textPrimary font-black text-2xl">{stats?.totalOrders || 0}</Text>
            <Text className="text-textMuted text-[10px] mt-0.5">All-time recorded</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 border border-emerald-100">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-emerald-700 text-[9px] font-bold uppercase">Active Now</Text>
              <View className="w-2 h-2 rounded-full bg-emerald-500" />
            </View>
            <Text className="text-emerald-600 font-black text-2xl">{stats?.activeOrdersCount || 0}</Text>
            <Text className="text-textMuted text-[10px] mt-0.5">In-progress orders</Text>
          </View>
        </View>

        {/* Pending Verifications */}
        {((stats?.pendingCookVerifications || 0) > 0 || (stats?.pendingRiderVerifications || 0) > 0) && (
          <>
            <Text className="text-textSecondary text-[10px] font-bold uppercase tracking-wider mb-2">
              Pending Verifications
            </Text>
            <View className="flex-row gap-2 mb-4">
              {stats?.pendingCookVerifications > 0 && (
                <View className="flex-1 bg-amber-50 rounded-2xl p-4 border border-amber-200">
                  <Text className="text-amber-800 text-[9px] font-bold uppercase mb-1">Cooks Awaiting</Text>
                  <Text className="text-amber-700 font-black text-2xl">{stats.pendingCookVerifications}</Text>
                  <Text className="text-amber-600 text-[10px] mt-0.5">Unverified cook accounts</Text>
                </View>
              )}
              {stats?.pendingRiderVerifications > 0 && (
                <View className="flex-1 bg-amber-50 rounded-2xl p-4 border border-amber-200">
                  <Text className="text-amber-800 text-[9px] font-bold uppercase mb-1">Riders Awaiting</Text>
                  <Text className="text-amber-700 font-black text-2xl">{stats.pendingRiderVerifications}</Text>
                  <Text className="text-amber-600 text-[10px] mt-0.5">Unverified rider accounts</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Payout Summary */}
        <Text className="text-textSecondary text-[10px] font-bold uppercase tracking-wider mb-2">
          Payout Overview
        </Text>
        <View className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
          {[
            {
              label: 'Pending Cook Payouts',
              value: payoutSummary?.totalPendingCookPayouts || 0,
              color: 'text-amber-700',
              bg: 'bg-amber-50',
            },
            {
              label: 'Settled Cook Payouts',
              value: payoutSummary?.totalSettledCookPayouts || 0,
              color: 'text-emerald-700',
              bg: 'bg-emerald-50',
            },
            {
              label: 'Pending Rider Payouts',
              value: payoutSummary?.totalPendingRiderPayouts || 0,
              color: 'text-indigo-700',
              bg: 'bg-indigo-50',
            },
            {
              label: 'Settled Rider Payouts',
              value: payoutSummary?.totalSettledRiderPayouts || 0,
              color: 'text-emerald-700',
              bg: 'bg-emerald-50',
            },
          ].map(({ label, value, color, bg }) => (
            <View key={label} className="flex-row items-center justify-between py-2.5 border-b border-gray-50">
              <Text className="text-textSecondary text-xs font-semibold flex-1">{label}</Text>
              <View className={`${bg} px-2.5 py-1 rounded-lg`}>
                <Text className={`${color} text-xs font-black`}>{formatLKRFull(value)}</Text>
              </View>
            </View>
          ))}

          <View className="flex-row items-center justify-between pt-3 mt-1">
            <Text className="text-textPrimary font-extrabold text-sm">Total Pending</Text>
            <Text className="text-primary font-black text-base">{formatLKRFull(totalPending)}</Text>
          </View>
        </View>

        {/* Payout Notice */}
        <View className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 mb-4 flex-row items-start">
          <Feather name="info" size={14} color="#D97706" />
          <Text className="text-amber-800 text-xs ml-2.5 flex-1 leading-relaxed">
            <Text className="font-bold">Settlement Notice: </Text>
            Settling a payout records the transaction in the platform system. Ensure the actual bank or mobile money transfer has been made externally before marking as settled.
          </Text>
        </View>

        {/* Individual Balances */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-textPrimary font-extrabold text-base">Individual Balances</Text>
          <View className="flex-row bg-gray-100 rounded-lg p-0.5">
            {(['ALL', 'COOK', 'RIDER'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setFilterRole(r)}
                className={`px-2.5 py-1 rounded-md ${filterRole === r ? 'bg-white shadow-sm' : ''}`}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-[10px] font-bold ${filterRole === r ? 'text-textPrimary' : 'text-textMuted'}`}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {filteredBalances.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 items-center border border-gray-100 mb-4">
            <View className="w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-3">
              <Feather name="check-circle" size={22} color="#10B981" />
            </View>
            <Text className="text-textPrimary font-bold text-sm">All Payouts Settled!</Text>
            <Text className="text-textMuted text-xs text-center mt-1">
              No pending balances for the selected filter.
            </Text>
          </View>
        ) : (
          filteredBalances.map((item: any) => {
            const hasPending = item.pendingBalance > 0;
            const isCook = item.role === 'COOK';
            return (
              <Card key={item.userId} className="mb-3 p-4" bordered>
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-row items-center flex-1 mr-3">
                    <View
                      className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                        isCook ? 'bg-orange-100' : 'bg-blue-100'
                      }`}
                    >
                      <Text className="text-base">{isCook ? '👨‍🍳' : '🛵'}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-textPrimary font-extrabold text-sm" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text className="text-textSecondary text-xs" numberOfLines={1}>
                        {item.email}
                      </Text>
                      {item.phone && (
                        <Text className="text-textMuted text-[10px]">{item.phone}</Text>
                      )}
                    </View>
                  </View>
                  <View className="items-end">
                    <Badge label={item.role} variant={isCook ? 'warning' : 'primary'} />
                    <Text className="text-textMuted text-[9px] mt-1.5 uppercase font-semibold">Pending</Text>
                    <Text
                      className={`font-black text-base ${hasPending ? 'text-primary' : 'text-emerald-600'}`}
                    >
                      {formatLKR(item.pendingBalance)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between bg-gray-50 rounded-xl px-3 py-2 mt-1">
                  <Text className="text-textSecondary text-xs">
                    Lifetime:{' '}
                    <Text className="font-bold text-textPrimary">{formatLKRFull(item.totalLifetimeEarnings)}</Text>
                  </Text>
                  <Text className="text-textMuted text-[10px]">
                    {item.pendingOrderCount} order{item.pendingOrderCount !== 1 ? 's' : ''} pending
                  </Text>
                </View>

                <View className="mt-3">
                  {hasPending ? (
                    <Button
                      title={`SETTLE ${formatLKR(item.pendingBalance)}`}
                      onPress={() =>
                        handleSettlePayout(item.userId, item.name, item.pendingBalance, item.role)
                      }
                      loading={settlingUserId === item.userId}
                      disabled={settlingUserId !== null && settlingUserId !== item.userId}
                      size="sm"
                      className="bg-emerald-600 border-emerald-600"
                    />
                  ) : (
                    <View className="py-2 items-center">
                      <Text className="text-emerald-600 text-xs font-bold">✓ All settled</Text>
                    </View>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};
