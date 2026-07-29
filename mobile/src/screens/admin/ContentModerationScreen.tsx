import React from 'react';
import { View, Text } from 'react-native';

export const ContentModerationScreen: React.FC = () => {
  return (
    <View className="flex-1 bg-surface-elevated p-6 justify-center items-center">
      <Text className="text-2xl text-primary font-bold mb-2">Content Moderation</Text>
      <Text className="text-textSecondary text-center text-sm">
        All listings and reviews are currently active. Checked listings and flagged reviews queue will appear here.
      </Text>
    </View>
  );
};
