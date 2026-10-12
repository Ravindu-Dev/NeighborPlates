import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  PanResponder,
  Animated,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';

export interface SlideToConfirmProps {
  label: string;
  confirmingLabel?: string;
  onConfirm: () => Promise<boolean | void> | boolean | void;
  loading?: boolean;
  knobColor?: string;
  backgroundColor?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export const SlideToConfirm: React.FC<SlideToConfirmProps> = ({
  label,
  confirmingLabel = 'Confirming...',
  onConfirm,
  loading: externalLoading = false,
  knobColor = '#EA580C',
  backgroundColor = '#0F172A',
  disabled = false,
  accessibilityLabel,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const knobSize = 50;
  const trackHeight = 60;
  const padding = 5;

  const panX = useRef(new Animated.Value(0)).current;
  const isConfirmed = useRef(false);

  const effectiveWidth = containerWidth > 0 ? containerWidth : 340;
  const maxTranslate = Math.max(0, effectiveWidth - knobSize - padding * 2);
  const isLoading = externalLoading || isProcessing;
  const isDisabled = disabled || isLoading || isSuccess;

  // Reset slider if disabled or external reset occurs
  useEffect(() => {
    if (!isLoading && !isSuccess && isConfirmed.current) {
      isConfirmed.current = false;
      Animated.spring(panX, {
        toValue: 0,
        useNativeDriver: false,
        friction: 8,
        tension: 40,
      }).start();
    }
  }, [isLoading, isSuccess]);

  const executeConfirm = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    isConfirmed.current = true;

    try {
      const result = await onConfirm();
      // If handler explicitly returned false, it indicates failure/error handled by caller
      if (result === false) {
        throw new Error('Confirmation unsuccessful');
      }

      setIsSuccess(true);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Keep success state momentarily before resetting
      setTimeout(() => {
        setIsSuccess(false);
        setIsProcessing(false);
        isConfirmed.current = false;
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: false,
          friction: 8,
          tension: 40,
        }).start();
      }, 850);
    } catch {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setIsProcessing(false);
      isConfirmed.current = false;
      // Spring back to starting position on error so rider can retry immediately
      Animated.spring(panX, {
        toValue: 0,
        useNativeDriver: false,
        friction: 6,
        tension: 45,
      }).start();
    }
  };

  const handleTapConfirm = () => {
    if (isDisabled || isConfirmed.current) return;
    isConfirmed.current = true;
    Animated.timing(panX, {
      toValue: maxTranslate,
      duration: 160,
      useNativeDriver: false,
    }).start(() => {
      executeConfirm();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isDisabled,
      onStartShouldSetPanResponderCapture: () => !isDisabled,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return !isDisabled && Math.abs(gestureState.dx) > 3;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return !isDisabled && Math.abs(gestureState.dx) > 3;
      },
      onPanResponderGrant: () => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      onPanResponderMove: (_, gestureState) => {
        if (isConfirmed.current || isDisabled) return;
        const newX = Math.max(0, Math.min(gestureState.dx, maxTranslate));
        panX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isConfirmed.current || isDisabled) return;

        // If tap or minimal slide (less than 8px), trigger smooth animated confirmation
        if (Math.abs(gestureState.dx) < 8) {
          handleTapConfirm();
          return;
        }

        // Completion threshold: 45% of available slide distance
        const threshold = maxTranslate * 0.45;

        if (gestureState.dx >= threshold && maxTranslate > 0) {
          // Snap thumb to end and execute confirmation
          Animated.timing(panX, {
            toValue: maxTranslate,
            duration: 120,
            useNativeDriver: false,
          }).start(() => {
            executeConfirm();
          });
        } else {
          // Smooth return to start if released before threshold
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: false,
            friction: 7,
            tension: 40,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        if (!isConfirmed.current) {
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: false,
            friction: 7,
          }).start();
        }
      },
    })
  ).current;

  // Interpolated progress track width following thumb
  const progressWidth = maxTranslate > 0
    ? panX.interpolate({
        inputRange: [0, maxTranslate],
        outputRange: [knobSize + padding * 2, effectiveWidth],
        extrapolate: 'clamp',
      })
    : knobSize + padding * 2;

  // Text opacity: smoothly fades out as thumb slides toward it
  const textOpacity = maxTranslate > 0
    ? panX.interpolate({
        inputRange: [0, maxTranslate * 0.45],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      })
    : 1;

  const currentLabel = isSuccess
    ? '✓ Confirmed!'
    : isLoading
    ? confirmingLabel
    : label;

  return (
    <View
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={{
        backgroundColor,
        height: trackHeight,
      }}
      className="rounded-full justify-center relative overflow-hidden shadow-lg border border-slate-700/60"
      accessible={true}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint="Slide right to confirm or tap to activate"
    >
      {/* ── Active Filled Progress Track ── */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: progressWidth,
          backgroundColor: isSuccess ? 'rgba(16, 185, 129, 0.28)' : 'rgba(234, 88, 12, 0.24)',
          borderRadius: 9999,
        }}
      />

      {/* ── Center Label Track with Tap Fallback ── */}
      <Pressable
        onPress={handleTapConfirm}
        disabled={isDisabled}
        style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 56 }}
      >
        <Animated.View
          style={{
            opacity: isLoading || isSuccess ? 1 : textOpacity,
          }}
        >
          <Text
            className={`font-black text-sm tracking-wide text-center select-none ${
              isSuccess ? 'text-[#34D399]' : 'text-white'
            }`}
            numberOfLines={1}
          >
            {currentLabel}
          </Text>
        </Animated.View>
      </Pressable>

      {/* ── Draggable Knob ── */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          transform: [{ translateX: panX }],
          width: knobSize,
          height: knobSize,
          backgroundColor: isSuccess ? '#10B981' : knobColor,
          left: padding,
          top: padding,
          cursor: isDisabled ? 'auto' : 'pointer',
        }}
        className="rounded-full items-center justify-center shadow-md absolute z-20"
      >
        {isSuccess ? (
          <Feather name="check" size={24} color="#FFFFFF" />
        ) : isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Feather name="chevrons-right" size={22} color="#FFFFFF" />
        )}
      </Animated.View>
    </View>
  );
};
