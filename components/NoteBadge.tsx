import { Text } from '@/components/ui/Text'
import { useThemeColors } from '@/theme/ThemeProvider'
import { Eye, Globe, Pencil, Users } from 'lucide-react-native'
import { View } from 'react-native'

export type NoteBadgeKind = 'public' | 'shared' | 'view' | 'edit'

const CONFIG = {
  public: { icon: Globe, label: 'Public' },
  shared: { icon: Users, label: 'Shared' },
  view: { icon: Eye, label: 'View' },
  edit: { icon: Pencil, label: 'Edit' },
} as const

/**
 * Small muted status pill for a note row (public / shared-out / received view|edit).
 * Modular by design: to remove the whole tagging feature, delete this file and stop
 * passing `badge` to NoteListItem — nothing else depends on it.
 */
export function NoteBadge({ kind }: { kind: NoteBadgeKind }) {
  const colors = useThemeColors()
  const { icon: Icon, label } = CONFIG[kind]
  return (
    <View className="flex-row items-center bg-surface-raised rounded-md px-2 py-0.5">
      <Icon size={11} color={colors.icon} strokeWidth={1.5} />
      <Text variant="label" className="ml-1 text-ink-muted">
        {label}
      </Text>
    </View>
  )
}
