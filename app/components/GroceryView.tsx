import { useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppColors } from '@/constants/Colors'
import { Toast } from '@/components/Toast'
import {
  useGroceryList,
  type GroceryItem,
} from '@/hooks/useGroceryList'

type Props = {
  userId: string
}

export function GroceryView({ userId }: Props) {
  const {
    list,
    items,
    loading,
    refreshing,
    refresh,
    toggleChecked,
    clearCompleted,
    checkedCount,
  } = useGroceryList(userId)
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

  const handleToggle = useCallback(
    async (item: GroceryItem) => {
      const result = await toggleChecked(item.id)
      if (!result.ok) showToast("Couldn't update — try again.", 'error')
    },
    [toggleChecked, showToast],
  )

  const handleClear = useCallback(() => {
    if (checkedCount === 0) return
    Alert.alert(
      'Clear completed?',
      `Remove ${checkedCount} checked item${checkedCount === 1 ? '' : 's'} from your list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const result = await clearCompleted()
            if (!result.ok) showToast("Couldn't clear — try again.", 'error')
          },
        },
      ],
    )
  }, [checkedCount, clearCompleted, showToast])

  if (loading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator color={AppColors.primary} />
      </View>
    )
  }

  if (!list || items.length === 0) {
    return (
      <>
        <FlatList
          data={[]}
          keyExtractor={(_, i) => String(i)}
          renderItem={null as any}
          ListEmptyComponent={<EmptyState />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={styles.emptyContent}
        />
        <Toast visible={toast.visible} message={toast.message} tone={toast.tone} />
      </>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        renderItem={({ item }) => (
          <GroceryRow item={item} onToggle={() => handleToggle(item)} />
        )}
      />

      {checkedCount > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-done" size={18} color={AppColors.primary} />
            <Text style={styles.clearText}>
              Clear completed ({checkedCount})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Toast visible={toast.visible} message={toast.message} tone={toast.tone} />
    </View>
  )
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="cart-outline" size={28} color={AppColors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Your grocery list is empty.</Text>
      <Text style={styles.emptyBody}>
        Tap "Add to grocery list" on a saved recipe's missing ingredients.
      </Text>
    </View>
  )
}

function GroceryRow({
  item,
  onToggle,
}: {
  item: GroceryItem
  onToggle: () => void
}) {
  return (
    <Pressable
      style={styles.row}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.is_checked }}
    >
      <View
        style={[
          styles.checkbox,
          item.is_checked && styles.checkboxChecked,
        ]}
      >
        {item.is_checked && (
          <Ionicons name="checkmark" size={14} color={AppColors.surface} />
        )}
      </View>
      <View style={styles.rowMain}>
        <Text
          style={[
            styles.rowName,
            item.is_checked && styles.rowNameChecked,
          ]}
          numberOfLines={1}
        >
          {item.ingredient_name}
        </Text>
        <View style={styles.rowMetaLine}>
          {!!item.quantity && (
            <Text style={styles.rowMeta}>{item.quantity}</Text>
          )}
          {!!item.source_recipe_title && (
            <>
              {!!item.quantity && <Text style={styles.rowMetaDot}>·</Text>}
              <Text style={styles.rowMetaSource} numberOfLines={1}>
                from {item.source_recipe_title}
              </Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
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
    paddingBottom: 96,
    gap: 6,
  },
  emptyContent: {
    flexGrow: 1,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
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
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: AppColors.text,
    textTransform: 'capitalize',
  },
  rowNameChecked: {
    color: AppColors.textLight,
    textDecorationLine: 'line-through',
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  rowMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: AppColors.textMuted,
  },
  rowMetaDot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: AppColors.textLight,
  },
  rowMetaSource: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: AppColors.textMuted,
    fontStyle: 'italic',
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  clearText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: AppColors.primary,
  },
})
