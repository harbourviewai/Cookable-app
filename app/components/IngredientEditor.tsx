import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppColors } from '@/constants/Colors'

export type DetectedIngredient = {
  name: string
  quantity_estimate: string
  expiring_soon: boolean
  confidence: 'high' | 'medium' | 'low'
}

type Props = {
  visible: boolean
  original: DetectedIngredient[]
  onClose: () => void
  onRegenerate: (args: {
    additional_ingredients: string[]
    removed_ingredients: string[]
  }) => Promise<void>
}

const SUBTITLE_COPY = "Tap any wrong items to remove them, or add what's missing."
const REGEN_LABEL = 'Regenerate recipes'
const LOADING_COPY = 'Updating your recipes…'
const ERROR_COPY = "Couldn't update — try again"

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase()
}

function diffIngredients(
  original: DetectedIngredient[],
  working: DetectedIngredient[],
): { additional_ingredients: string[]; removed_ingredients: string[] } {
  const originalNames = new Set(original.map((i) => normalizeName(i.name)))
  const workingNames = new Set(working.map((i) => normalizeName(i.name)))
  const additional_ingredients = working
    .map((i) => i.name.trim())
    .filter((n) => n && !originalNames.has(normalizeName(n)))
  const removed_ingredients = original
    .map((i) => i.name)
    .filter((n) => !workingNames.has(normalizeName(n)))
  return { additional_ingredients, removed_ingredients }
}

function listsIdentical(
  a: DetectedIngredient[],
  b: DetectedIngredient[],
): boolean {
  if (a.length !== b.length) return false
  const serialize = (i: DetectedIngredient) =>
    JSON.stringify({
      n: normalizeName(i.name),
      q: i.quantity_estimate ?? '',
      e: !!i.expiring_soon,
    })
  const aSet = a.map(serialize).sort()
  const bSet = b.map(serialize).sort()
  return aSet.every((v, idx) => v === bSet[idx])
}

export function IngredientEditor({
  visible,
  original,
  onClose,
  onRegenerate,
}: Props) {
  const [snapshot, setSnapshot] = useState<DetectedIngredient[]>(original)
  const [working, setWorking] = useState<DetectedIngredient[]>(original)
  const [newItem, setNewItem] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Snapshot the original list when the sheet opens. Don't depend on
  // `original` directly — if the scan refetches mid-edit we'd otherwise
  // wipe the user's in-progress changes.
  useEffect(() => {
    if (visible) {
      setSnapshot(original)
      setWorking(original)
      setNewItem('')
      setError(null)
      setSubmitting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const hasChanges = useMemo(
    () => !listsIdentical(snapshot, working),
    [snapshot, working],
  )

  const updateRow = useCallback(
    (index: number, patch: Partial<DetectedIngredient>) => {
      setWorking((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], ...patch }
        return next
      })
    },
    [],
  )

  const removeRow = useCallback((index: number) => {
    setWorking((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const addRow = useCallback(() => {
    const trimmed = newItem.trim()
    if (!trimmed) return
    const exists = working.some(
      (i) => normalizeName(i.name) === normalizeName(trimmed),
    )
    if (exists) {
      setNewItem('')
      return
    }
    setWorking((prev) => [
      ...prev,
      {
        name: trimmed,
        quantity_estimate: '',
        expiring_soon: false,
        confidence: 'high',
      },
    ])
    setNewItem('')
  }, [newItem, working])

  const handleRegenerate = useCallback(async () => {
    if (!hasChanges || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onRegenerate(diffIngredients(snapshot, working))
      // Parent dismisses on success.
    } catch (err) {
      console.error('Regenerate failed:', err)
      setError(ERROR_COPY)
      setSubmitting(false)
    }
  }, [hasChanges, submitting, onRegenerate, snapshot, working])

  const handleClose = useCallback(() => {
    if (submitting) return
    onClose()
  }, [submitting, onClose])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouchable} onPress={handleClose} />
        <KeyboardAvoidingView
          style={styles.sheetWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.sheet}>
            {/* Header --------------------------------------------------- */}
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Edit ingredients</Text>
                <Text style={styles.headerSubtitle}>{SUBTITLE_COPY}</Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close ingredient editor"
              >
                <Ionicons name="close" size={24} color={AppColors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Working list -------------------------------------------- */}
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            >
              {working.map((item, index) => (
                <Row
                  key={`${index}-${item.name}`}
                  item={item}
                  onToggleExpiring={() =>
                    updateRow(index, { expiring_soon: !item.expiring_soon })
                  }
                  onChangeQuantity={(q) =>
                    updateRow(index, { quantity_estimate: q })
                  }
                  onDelete={() => removeRow(index)}
                />
              ))}

              <View style={styles.addRow}>
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={AppColors.primary}
                />
                <TextInput
                  style={styles.addInput}
                  placeholder="Add an ingredient…"
                  placeholderTextColor={AppColors.textLight}
                  value={newItem}
                  onChangeText={setNewItem}
                  returnKeyType="done"
                  onSubmitEditing={addRow}
                  blurOnSubmit={false}
                  autoCapitalize="none"
                />
              </View>
            </ScrollView>

            {/* Footer --------------------------------------------------- */}
            {error && (
              <View style={styles.errorRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color={AppColors.error}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.regenButton,
                  (!hasChanges || submitting) && styles.regenButtonDisabled,
                ]}
                onPress={handleRegenerate}
                disabled={!hasChanges || submitting}
                accessibilityRole="button"
                accessibilityState={{ disabled: !hasChanges || submitting }}
              >
                {submitting ? (
                  <View style={styles.regenLoading}>
                    <ActivityIndicator color={AppColors.surface} />
                    <Text style={styles.regenButtonText}>{LOADING_COPY}</Text>
                  </View>
                ) : (
                  <Text style={styles.regenButtonText}>{REGEN_LABEL}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.doneButton}
                onPress={handleClose}
                disabled={submitting}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

function Row({
  item,
  onToggleExpiring,
  onChangeQuantity,
  onDelete,
}: {
  item: DetectedIngredient
  onToggleExpiring: () => void
  onChangeQuantity: (value: string) => void
  onDelete: () => void
}) {
  const [localQty, setLocalQty] = useState(item.quantity_estimate ?? '')

  // Sync local edits from outside (e.g. row reorder after delete).
  useEffect(() => {
    setLocalQty(item.quantity_estimate ?? '')
  }, [item.quantity_estimate])

  return (
    <View style={[styles.row, item.expiring_soon && styles.rowExpiring]}>
      <Pressable
        onPress={onToggleExpiring}
        hitSlop={8}
        style={styles.dotHit}
        accessibilityRole="button"
        accessibilityLabel={
          item.expiring_soon
            ? 'Marked expiring soon. Tap to clear.'
            : 'Tap to mark expiring soon.'
        }
        accessibilityState={{ selected: item.expiring_soon }}
      >
        <View
          style={[
            styles.dot,
            item.expiring_soon ? styles.dotFilled : styles.dotHollow,
          ]}
        />
      </Pressable>

      <View style={styles.rowText}>
        <Text style={styles.rowName}>{capitalize(item.name)}</Text>
        <TextInput
          style={styles.rowQty}
          value={localQty}
          onChangeText={setLocalQty}
          onBlur={() => onChangeQuantity(localQty)}
          placeholder="quantity"
          placeholderTextColor={AppColors.textLight}
          returnKeyType="done"
        />
      </View>

      <TouchableOpacity
        onPress={onDelete}
        hitSlop={8}
        style={styles.trashButton}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.name}`}
      >
        <Ionicons name="trash-outline" size={20} color={AppColors.textMuted} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 12,
    paddingTop: 8,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  headerTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: AppColors.text,
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: AppColors.textMuted,
  },
  closeButton: {
    padding: 4,
  },

  // List
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 4,
    paddingBottom: 24,
    gap: 8,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  rowExpiring: {
    borderLeftWidth: 3,
    borderLeftColor: AppColors.accent,
  },
  dotHit: {
    paddingVertical: 4,
    paddingRight: 4,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  dotFilled: {
    backgroundColor: AppColors.accent,
    borderColor: AppColors.accent,
  },
  dotHollow: {
    backgroundColor: 'transparent',
    borderColor: AppColors.textLight,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: AppColors.text,
  },
  rowQty: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.textMuted,
    padding: 0,
    margin: 0,
  },
  trashButton: {
    padding: 4,
  },

  // Add row
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.text,
    padding: 0,
    margin: 0,
  },

  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: AppColors.error,
  },

  // Footer
  footer: {
    gap: 8,
    paddingTop: 8,
  },
  regenButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regenButtonDisabled: {
    opacity: 0.5,
  },
  regenButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: AppColors.surface,
  },
  regenLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  doneButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: AppColors.textMuted,
  },
})
