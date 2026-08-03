import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming 
} from 'react-native-reanimated';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  className = '',
}) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    // Pulse opacity animation sequence
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 850 }),
        withTiming(0.3, { duration: 850 })
      ),
      -1, // Loop indefinitely
      true // Reverse direction
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius, backgroundColor: '#E5E7EB' }, animatedStyle]}
      className={className}
    />
  );
};
