import { StyleSheet, TouchableWithoutFeedback, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { PostScanAuthModal } from '@/components/PostScanAuthModal'
import { useUserContext } from '@/components/UserProvider'

export default function AuthGateScreen() {
  const router = useRouter()
  const { reason } = useLocalSearchParams<{ reason?: string }>()
  const { user } = useUserContext()
  const isRequired = reason === 'scan_limit' || reason === 'cooked'

  function finishAuthGate() {
    if (reason === 'scan_limit') {
      router.replace('/(tabs)/camera' as any)
      return
    }
    router.replace('/onboarding/soft-paywall' as any)
  }

  return (
    <View style={styles.backdrop}>
      <TouchableWithoutFeedback onPress={isRequired ? undefined : finishAuthGate}>
        <View style={styles.scrim} />
      </TouchableWithoutFeedback>
      <PostScanAuthModal
        userId={user?.id}
        onComplete={finishAuthGate}
        onMaybeLater={finishAuthGate}
        required={isRequired}
        headline={reason === 'scan_limit' ? 'Create an account to keep scanning' : 'Save your first Cookable meal'}
        subhead={
          reason === 'scan_limit'
            ? 'Create an account today to receive 3 more scans this week for free.'
            : 'Create an account to save your recipes and unlock 3 more free scans this week.'
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
})
