import { useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppColors } from '@/constants/Colors'
import { Toast } from '@/components/Toast'
import {
  usePantry,
  isUseSoon,
  type PantryItem,
} from '@/hooks/usePantry'

type Props = {
  userId: string
}

export function PantryView({ userId }: Props) {
  const { items, loading, refreshing, refresh, addManual, remove } = usePantry(userId)
  const [addOpen, setAddOpen] = useState(false)
  const [toast, setToast] = useState<{
    visible: boolean
    message: string
    tone: 'success' | 'error'
  }>({ visible: false, message: '', tone: 'success' })

  const showToast = useCallback(
    (message: string, tone: 'success' | 'error' = 'success') => {
      setToast({ visible: true, message, tone })
      setTimeout(() => setToast((t) => ({ ...t, visible: false })), 1500)
    },
    [],
  )

  const handleRemove = useCallback(
    async (item: PantryItem) => {
      const result = await remove(item.id)
      if (!result.ok) showToast("Couldn't remove — try again.", 'error')
    },
    [remove, showToast],
  )

  if (loading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator color={AppColors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        renderItem={({ item }) => (
          <PantryRow item={item} onRemove={() => handleRemove(item)} />
        )}
      />

      <View style={styles.fabWrap} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setAddOpen(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Add ingredient"
        >
          <Ionicons name="add" size={20} color={AppColors.surface} />
          <Text style={styles.fabText}>Add ingredient</Text>
        </TouchableOpacity>
      </View>

      <AddIngredientModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={async (name, quantity, expires) => {
          const result = await addManual(name, quantity, expires)
          if (!result.ok) {
            showToast(result.error, 'error')
            return
          }
          setAddOpen(false)
          showToast('Added.')
        }}
      />

      <Toast visible={toast.visible} message={toast.message} tone={toast.tone} />
    </View>
  )
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="archive-outline" size={28} color={AppColors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Your pantry's empty.</Text>
      <Text style={styles.emptyBody}>
        Run a scan and we'll start tracking.
      </Text>
    </View>
  )
}

function PantryRow({
  item,
  onRemove,
}: {
  item: PantryItem
  onRemove: () => void
}) {
  const useSoon = isUseSoon(item)
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons
          name={item.added_via === 'scan' ? 'camera-outline' : 'create-outline'}
          size={16}
          color={AppColors.textMuted}
        />
      </View>
      <View style={styles.rowMain}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.ingredient_name}
        </Text>
        <View style={styles.rowMetaLine}>
          {!!item.quantity_estimate && (
            <Text style={styles.rowMeta}>{item.quantity_estimate}</Text>
          )}
          {useSoon && (
            <View style={styles.useSoonBadge}>
              <Text style={styles.useSoonText}>Use soon</Text>
            </View>
          )}
        </View>
      </View>
      <Pressable
        onPress={onRemove}
        hitSlop={10}
        style={styles.removeButton}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.ingredient_name}`}
      >
        <Ionicons name="trash-outline" size={18} color={AppColors.textLight} />
      </Pressable>
    </View>
  )
}

function AddIngredientModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean
  onClose: () => void
  onSubmit: (name: string, quantity: string, expires: string | null) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = useCallback(() => {
    setName('')
    setQuantity('')
    setSubmitting(false)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || submitting) return
    setSubmitting(true)
    await onSubmit(name, quantity, null)
    reset()
  }, [name, quantity, submitting, onSubmit, reset])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleClose} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Add ingredient</Text>

          <Text style={styles.modalLabel}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Eggs"
            placeholderTextColor={AppColors.textLight}
            style={styles.modalInput}
            autoFocus
          />

          <Text style={styles.modalLabel}>Quantity (optional)</Text>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            placeholder="e.g. 6 left"
            placeholderTextColor={AppColors.textLight}
            style={styles.modalInput}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={handleClose} style={styles.modalGhostButton}>
              <Text style={styles.modalGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[
                styles.modalPrimaryButton,
                (!name.trim() || submitting) && styles.modalPrimaryButtonDisabled,
              ]}
              disabled={!name.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={AppColors.surface} />
              ) : (
                <Text style={styles.modalPrimaryText}>Add</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 8,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(45, 95, 78, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 20,
    color: AppColors.text,
  },
  emptyBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: AppColors.textMuted,
    textAlign: 'center',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 12,
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: AppColors.text,
    textTransform: 'capitalize',
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: AppColors.textMuted,
  },
  useSoonBadge: {
    backgroundColor: 'rgba(232, 155, 60, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  useSoonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#7A4A0F',
  },
  removeButton: {
    padding: 6,
  },

  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AppColors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: AppColors.surface,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  modalTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 20,
    color: AppColors.text,
    marginBottom: 8,
  },
  modalLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: AppColors.textMuted,
    marginTop: 4,
  },
  modalInput: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: AppColors.text,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  modalGhostButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalGhostText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: AppColors.textMuted,
  },
  modalPrimaryButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  modalPrimaryButtonDisabled: {
    opacity: 0.5,
  },
  modalPrimaryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: AppColors.surface,
  },
})
