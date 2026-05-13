import type { RecipeSummary } from '@/components/RecipeCard'

export type Recipe = RecipeSummary & {
  ingredients_used: Array<{ name: string; amount: string }>
  ingredients_missing: Array<{ name: string; amount: string; optional: boolean }>
  steps: string[]
  why_this_recipe: string
}
