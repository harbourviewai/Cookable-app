import { useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { AppColors } from '@/constants/Colors'
import { useUserContext } from '@/components/UserProvider'
import { PantryUpsell } from '@/components/PantryUpsell'
import { PantryView } from '@/components/PantryView'
import { GroceryView } from '@/components/GroceryView'
import { useGroceryList } from '@/hooks/useGroceryList'

type Segment = 'pantry' | 'grocery'

export default function PantryTab() {
  const { user, tier } = useUserContext()
  const [segment, setSegment] = useState<Segment>('pantry')

  if (tier !== 'plus') {
    return (
      <View style={styles.screen}>
        <PantryUpsell />
      </View>
    )
  }

  if (!user?.id) {
    return <View style={styles.screen} />
  }

  return (
    <View style={styles.screen}>
      <SegmentedControl
        userId={user.id}
        segment={segment}
        onChange={setSegment}
      />
      {segment === 'pantry' ? (
        <PantryView userId={user.id} />
      ) : (
        <GroceryView userId={user.id} />
      )}
    </View>
  )
}

function SegmentedControl({
  userId,
  segment,
  onChange,
}: {
  userId: string
  segment: Segment
  onChange: (s: Segment) => void
}) {
  // Read the active grocery list count purely so we can decorate the Grocery
  // tab with a badge — this query is light and cached by Supabase's HTTP layer.
  const { items } = useGroceryList(userId)
  const activeCount = items.filter((i) => !i.is_checked).length

  return (
    <View style={styles.segmentWrap}>
      <View style={styles.segment}>
        <Pressable
          style={[styles.segmentButton, segment === 'pantry' && styles.segmentButtonActive]}
          onPress={() => onChange('pantry')}
          accessibilityRole="button"
          accessibilityState={{ selected: segment === 'pantry' }}
        >
          <Text
            style={[
              styles.segmentLabel,
              segment === 'pantry' && styles.segmentLabelActive,
            ]}
          >
            Pantry
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentButton, segment === 'grocery' && styles.segmentButtonActive]}
          onPress={() => onChange('grocery')}
          accessibilityRole="button"
          accessibilityState={{ selected: segment === 'grocery' }}
        >
          <Text
            style={[
              styles.segmentLabel,
              segment === 'grocery' && styles.segmentLabelActive,
            ]}
          >
            Grocery
          </Text>
          {activeCount > 0 && (
            <View
              style={[
                styles.badge,
                segment === 'grocery' && styles.badgeActive,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  segment === 'grocery' && styles.badgeTextActive,
                ]}
              >
                {activeCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  segmentWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: AppColors.primary,
  },
  segmentLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: AppColors.textMuted,
  },
  segmentLabelActive: {
    color: AppColors.surface,
  },
  badge: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: AppColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: AppColors.textMuted,
  },
  badgeTextActive: {
    color: AppColors.surface,
  },
})
