import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { AppColors } from '@/constants/Colors'

const PREVIEW_ITEMS = [
  { name: 'Eggs', meta: '6 left', useSoon: false },
  { name: 'Milk', meta: 'Use soon', useSoon: true },
  { name: 'Spinach', meta: '1 bag', useSoon: false },
]

export function PantryUpsell() {
  const router = useRouter()

  const handleCta = () => {
    router.push('/paywall?source=pantry' as any)
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.previewCard}>
        {PREVIEW_ITEMS.map((item) => (
          <View key={item.name} style={styles.previewRow}>
            <View style={styles.previewIcon}>
              <Ionicons name="leaf-outline" size={18} color={AppColors.primary} />
            </View>
            <Text style={styles.previewName}>{item.name}</Text>
            <Text style={styles.previewDot}>·</Text>
            <Text
              style={[
                styles.previewMeta,
                item.useSoon && styles.previewMetaUseSoon,
              ]}
            >
              {item.meta}
            </Text>
          </View>
        ))}
        <View style={styles.previewOverlay} pointerEvents="none" />
      </View>

      <View style={styles.copyBlock}>
        <Text style={styles.headline}>Track what you have.</Text>
        <Text style={styles.body}>
          Plus tracks every ingredient across your scans, flags what's about to go bad,
          and turns missing ingredients into a grocery list.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.ctaButton}
        onPress={handleCta}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Try Plus free for 7 days"
      >
        <Text style={styles.ctaText}>Try Plus Free 7 Days</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 24,
  },
  previewCard: {
    position: 'relative',
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 16,
    gap: 12,
    opacity: 0.5,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(45, 95, 78, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: AppColors.text,
  },
  previewDot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.textLight,
  },
  previewMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.textMuted,
  },
  previewMetaUseSoon: {
    color: AppColors.accent,
    fontFamily: 'Inter_600SemiBold',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(250, 247, 242, 0.4)',
    borderRadius: 16,
  },

  copyBlock: {
    gap: 8,
  },
  headline: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: AppColors.text,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.textMuted,
  },

  ctaButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: AppColors.surface,
  },
})
