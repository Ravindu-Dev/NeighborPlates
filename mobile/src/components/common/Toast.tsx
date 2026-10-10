import React, { useEffect, useRef } from 'react';
import { Text, Animated } from 'react-native';

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
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      // Slide down with a spring bounce
      Animated.spring(translateY, {
        toValue: 40,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        // Slide back up after 3 seconds
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) {
            onDismiss();
          }
        });
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const bgColors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-primary-dark',
  };

  return (
    <Animated.View 
      style={{ transform: [{ translateY }] }}
      className={`absolute top-0 left-4 right-4 rounded-2xl p-4 shadow-lg z-50 flex-row items-center justify-between ${bgColors[type]}`}
    >
      <Text className="text-white font-extrabold text-sm flex-1">{message}</Text>
    </Animated.View>
  );
};

