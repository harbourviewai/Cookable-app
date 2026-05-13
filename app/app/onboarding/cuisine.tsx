import { useState } from 'react'
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { OnboardingFrame } from '@/components/OnboardingFrame'
import { updateOnboardingState } from '@/lib/onboarding'
import { AppColors } from '@/constants/Colors'

const cuisines = [
  'Italian',
  'Mexican',
  'Chinese',
  'Indian',
  'Thai',
  'Japanese',
  'Mediterranean',
  'Korean',
  'French',
  'American',
  'Middle Eastern',
  'BBQ/Grill',
  'Surprise me with anything',
]

export default function CuisineScreen() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])

  function toggleCuisine(cuisine: string) {
    setSelected((current) =>
      current.includes(cuisine)
        ? current.filter((item) => item !== cuisine)
        : [...current, cuisine],
    )
  }

  async function continueNext() {
    await updateOnboardingState({ cuisines: selected })
    router.push('/onboarding/notifications' as any)
  }

  return (
    <OnboardingFrame
      headline="What do you like to eat?"
      subhead="Pick a few. We'll focus your recipes on these."
      primaryLabel={`Continue${selected.length > 0 ? ` ${selected.length} selected` : ''}`}
      onPrimaryPress={continueNext}
      primaryDisabled={selected.length === 0}
    >
      <View style={styles.grid}>
        {cuisines.map((cuisine) => {
          const isSelected = selected.includes(cuisine)
          return (
            <TouchableOpacity
              key={cuisine}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggleCuisine(cuisine)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {cuisine}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </OnboardingFrame>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: AppColors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  chipSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: AppColors.text,
  },
  chipTextSelected: {
    color: AppColors.surface,
  },
})
