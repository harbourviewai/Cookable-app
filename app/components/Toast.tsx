import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppColors } from '@/constants/Colors'

type ToastTone = 'success' | 'error'

type Props = {
  visible: boolean
  message: string
  tone?: ToastTone
}

// Simple absolute-positioned toast pill. Caller controls visibility — flip
// `visible` to true and back to false after ~1.5s using a setTimeout.
export function Toast({ visible, message, tone = 'success' }: Props) {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start()
  }, [visible, opacity])

  const iconName = tone === 'success' ? 'checkmark-circle' : 'alert-circle'
  const iconColor = tone === 'success' ? AppColors.success : AppColors.error

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { opacity }]}
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <View style={styles.pill}>
        <Ionicons name={iconName} size={16} color={iconColor} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AppColors.surface,
    borderColor: AppColors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  text: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: AppColors.text,
  },
})
