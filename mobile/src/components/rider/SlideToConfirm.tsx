import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  PanResponder,
  Animated,
  Platform,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';

interface SlideToConfirmProps {
  label: string;
  onConfirm: () => void;
  knobColor?: string;
  backgroundColor?: string;
  disabled?: boolean;
}

export const SlideToConfirm: React.FC<SlideToConfirmProps> = ({
  label,
  onConfirm,
  knobColor = '#C25E00',
  backgroundColor = '#1E293B',
  disabled = false,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const knobWidth = 52;
  const padding = 6;
  const panX = useRef(new Animated.Value(0)).current;
  const isConfirmed = useRef(false);

  const maxTranslate = Math.max(0, containerWidth - knobWidth - padding * 2);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderMove: (_, gestureState) => {
        if (isConfirmed.current || disabled) return;
        const newX = Math.max(0, Math.min(gestureState.dx, maxTranslate));
        panX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isConfirmed.current || disabled) return;
        if (gestureState.dx > maxTranslate * 0.65) {
          // Success! Complete slide
          isConfirmed.current = true;
          Animated.timing(panX, {
            toValue: maxTranslate,
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            onConfirm();
            setTimeout(() => {
              isConfirmed.current = false;
              Animated.spring(panX, {
                toValue: 0,
                useNativeDriver: false,
              }).start();
            }, 600);
          });
        } else {
          // Reset back to start
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: false,
            friction: 7,
          }).start();
        }
      },
    })
  ).current;

  // Handle tap fallback for accessibility / web convenience
  const handleTapConfirm = () => {
    if (disabled || isConfirmed.current) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onConfirm();
  };

  return (
    <View
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={{ backgroundColor }}
      className="h-16 rounded-full justify-center relative overflow-hidden shadow-md"
    >
      {/* Label Text */}
      <View className="absolute inset-0 items-center justify-center pointer-events-none pl-8 pr-4">
        <Text className="text-white font-extrabold text-sm tracking-wide">
          {label}
        </Text>
      </View>

      {/* Draggable Knob */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          transform: [{ translateX: panX }],
          width: knobWidth,
          height: knobWidth,
          backgroundColor: knobColor,
          left: padding,
        }}
        className="rounded-full items-center justify-center shadow-lg absolute"
      >
        <TouchableOpacity
          onPress={handleTapConfirm}
          activeOpacity={0.9}
          className="w-full h-full items-center justify-center rounded-full"
        >
          <Feather name="chevrons-right" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};
