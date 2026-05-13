import { TouchableOpacity, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { OnboardingFrame, onboardingStyles } from '@/components/OnboardingFrame'
import { updateOnboardingState } from '@/lib/onboarding'

type Skill = 'beginner' | 'intermediate' | 'confident'

const skills: { value: Skill; title: string; body: string }[] = [
  { value: 'beginner', title: '🥄 Just starting', body: 'Simple recipes, basic techniques' },
  { value: 'intermediate', title: '🍳 Home cook', body: 'I cook regularly' },
  { value: 'confident', title: '🔪 Confident', body: 'Bring on the techniques' },
]

export default function SkillScreen() {
  const router = useRouter()

  async function selectSkill(skillLevel: Skill) {
    await updateOnboardingState({ skillLevel })
    router.push('/onboarding/cuisine' as any)
  }

  return (
    <OnboardingFrame
      headline="How would you describe your cooking?"
      subhead="We'll match recipes to your level."
    >
      {skills.map((skill) => (
        <TouchableOpacity
          key={skill.value}
          style={onboardingStyles.card}
          onPress={() => selectSkill(skill.value)}
        >
          <Text style={onboardingStyles.cardTitle}>{skill.title}</Text>
          <Text style={onboardingStyles.cardBody}>{skill.body}</Text>
        </TouchableOpacity>
      ))}
    </OnboardingFrame>
  )
}
