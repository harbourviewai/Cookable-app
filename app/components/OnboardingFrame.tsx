import { ReactNode } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppColors } from '@/constants/Colors'

type Props = {
  eyebrow?: string
  headline: string
  subhead?: string
  children?: ReactNode
  primaryLabel?: string
  onPrimaryPress?: () => void
  primaryDisabled?: boolean
  secondaryLabel?: string
  onSecondaryPress?: () => void
}

export function OnboardingFrame({
  eyebrow,
  headline,
  subhead,
  children,
  primaryLabel,
  onPrimaryPress,
  primaryDisabled,
  secondaryLabel,
  onSecondaryPress,
}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.headline}>{headline}</Text>
        {subhead ? <Text style={styles.subhead}>{subhead}</Text> : null}
        {children ? <View style={styles.body}>{children}</View> : null}
      </View>
      <View style={styles.footer}>
        {primaryLabel && onPrimaryPress ? (
          <TouchableOpacity
            style={[styles.primaryButton, primaryDisabled && styles.primaryButtonDisabled]}
            onPress={onPrimaryPress}
            disabled={primaryDisabled}
          >
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          </TouchableOpacity>
        ) : null}
        {secondaryLabel && onSecondaryPress ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={onSecondaryPress}>
            <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  )
}

export const onboardingStyles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cardSelected: {
    borderColor: AppColors.primary,
    backgroundColor: '#EEF6F2',
  },
  cardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: AppColors.text,
  },
  cardBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.textMuted,
    lineHeight: 20,
    marginTop: 4,
  },
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: AppColors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  headline: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 34,
    lineHeight: 40,
    color: AppColors.text,
  },
  subhead: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    lineHeight: 25,
    color: AppColors.textMuted,
    marginTop: 12,
  },
  body: {
    marginTop: 28,
    gap: 12,
  },
  footer: {
    paddingBottom: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: AppColors.surface,
  },
  secondaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: AppColors.textMuted,
  },
})
