import { Stack } from 'expo-router'
import { AppColors } from '@/constants/Colors'

export default function SavedLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: AppColors.background },
        headerShadowVisible: false,
        headerTintColor: AppColors.primary,
        headerTitleStyle: {
          fontFamily: 'Inter_600SemiBold',
          color: AppColors.text,
          fontSize: 17,
        },
        contentStyle: { backgroundColor: AppColors.background },
      }}
    >
      <Stack.Screen name="[id]" options={{ title: 'Recipe' }} />
    </Stack>
  )
}
