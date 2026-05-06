import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { AppColors } from '@/constants/Colors'
import { useUser } from '@/hooks/useUser'

export default function HomeScreen() {
  const { user, profile } = useUser()

  const firstName =
    profile?.display_name?.split(' ')[0] ??
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ??
    (user?.user_metadata?.name as string | undefined)?.split(' ')[0] ??
    null

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {firstName ? `Hey, ${firstName}` : 'Hey there'}
        </Text>
        <Text style={styles.tagline}>Cook anything. Waste nothing.</Text>
      </View>

      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => router.push('/(tabs)/camera')}
        activeOpacity={0.85}
      >
        <Ionicons name="camera" size={22} color={AppColors.surface} />
        <Text style={styles.scanButtonText}>Scan your fridge</Text>
      </TouchableOpacity>

      <View style={styles.emptyState}>
        <Ionicons name="receipt-outline" size={48} color={AppColors.textLight} />
        <Text style={styles.emptyTitle}>No recipes yet</Text>
        <Text style={styles.emptyBody}>
          Point your camera at whatever's in your fridge. Cookable will figure out what you can cook tonight.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    flexGrow: 1,
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    color: AppColors.text,
    marginBottom: 6,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: AppColors.textMuted,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 48,
  },
  scanButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: AppColors.surface,
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: AppColors.text,
    marginTop: 4,
  },
  emptyBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
})
