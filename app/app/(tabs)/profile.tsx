import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { AppColors } from '@/constants/Colors'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabase'

export default function ProfileScreen() {
  const { user, profile } = useUser()

  const displayName =
    profile?.display_name ??
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    'Your account'

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut()
          if (error) Alert.alert('Error', 'Could not sign out. Try again.')
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarInitial}>
          {displayName.charAt(0).toUpperCase()}
        </Text>
      </View>

      <Text style={styles.name}>{displayName}</Text>
      {user?.email && <Text style={styles.email}>{user.email}</Text>}

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Plan</Text>
        <Text style={styles.sectionValue}>Free</Text>
      </View>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  avatarInitial: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 30,
    color: AppColors.surface,
  },
  name: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: AppColors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  email: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginVertical: 16,
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  sectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: AppColors.text,
  },
  sectionValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: AppColors.textMuted,
  },
  signOutButton: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.error,
    borderRadius: 14,
  },
  signOutText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: AppColors.error,
  },
})
