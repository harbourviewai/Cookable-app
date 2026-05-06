export const AppColors = {
  primary: '#2D5F4E',    // Forest Pine
  accent: '#E89B3C',     // Saffron
  background: '#FAF7F2', // Linen
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E8E4DE',
  error: '#C0392B',
  success: '#27AE60',
} as const

export default {
  light: {
    text: AppColors.text,
    background: AppColors.background,
    tint: AppColors.primary,
    tabIconDefault: AppColors.textLight,
    tabIconSelected: AppColors.primary,
  },
  dark: {
    text: '#FAF7F2',
    background: '#1A1A1A',
    tint: AppColors.accent,
    tabIconDefault: '#6B7280',
    tabIconSelected: AppColors.accent,
  },
}
