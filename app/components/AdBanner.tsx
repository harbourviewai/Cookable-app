import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads'
import { getBannerUnitId, nonPersonalizedAdRequest } from '@/lib/ads'
import { useUser } from '@/hooks/useUser'
import { AppColors } from '@/constants/Colors'

type Props = {
  // Logical surface name for analytics (e.g. 'results'). Not yet wired to PostHog.
  placement: string
}

// Renders a free-tier banner ad. Returns null for Plus/Pro to avoid even mounting
// the BannerAd component (which would still trigger an ad request). Reserves a
// minimum height so the layout doesn't jump when the ad finishes loading.
export function AdBanner({ placement }: Props) {
  const { profile } = useUser()
  const [failed, setFailed] = useState(false)

  if (profile?.subscription_tier !== 'free') return null
  if (failed) return null

  return (
    <View style={styles.wrapper}>
      <BannerAd
        unitId={getBannerUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={nonPersonalizedAdRequest}
        onAdLoaded={() => {
          if (__DEV__) console.log(`[ads] banner loaded (${placement})`)
        }}
        onAdFailedToLoad={(err) => {
          if (__DEV__) console.log(`[ads] banner failed (${placement}):`, err?.message)
          // Collapse the reserved space if the ad permanently fails — better than
          // leaving a 60pt empty block.
          setFailed(true)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.background,
  },
})
