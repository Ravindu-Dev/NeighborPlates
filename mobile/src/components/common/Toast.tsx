import React, { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  runOnJS 
} from 'react-native-reanimated';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onDismiss: () => void;
  visible: boolean;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  onDismiss,
  visible,
}) => {
  const translateY = useSharedValue(-100);

  useEffect(() => {
    if (visible) {
      // Slide down with a spring bounce
      translateY.value = withSpring(40);
      
      const timer = setTimeout(() => {
        // Slide back up after 3 seconds
        translateY.value = withTiming(-100, {}, (finished) => {
          if (finished) {
            runOnJS(onDismiss)();
          }
        });
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      translateY.value = withTiming(-100);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  if (!visible) return null;

  const bgColors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-primary-dark',
  };

  return (
    <Animated.View 
      style={animatedStyle}
      className={`absolute top-0 left-4 right-4 rounded-2xl p-4 shadow-lg z-50 flex-row items-center justify-between ${bgColors[type]}`}
    >
      <Text className="text-white font-extrabold text-sm flex-1">{message}</Text>
    </Animated.View>
  );
};
