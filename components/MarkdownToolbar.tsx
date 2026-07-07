import { Text } from '@/components/ui/Text'
import { useThemeColors } from '@/theme/ThemeProvider'
import { Code, List, ListOrdered, Quote } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export type ToolbarAction =
  | 'bold' | 'italic' | 'strike'
  | 'h1' | 'h2' | 'h3'
  | 'bullet' | 'ordered' | 'code' | 'quote'

type Props = {
  onAction: (action: ToolbarAction) => void
}

type ButtonDef =
  | { type: 'text'; label: string; action: ToolbarAction; style?: object }
  | { type: 'icon'; Icon: LucideIcon; action: ToolbarAction }

// One scrollable row. Icon colour is applied at render (themed) — see ToolbarButton.
const ACTIONS: ButtonDef[] = [
  { type: 'text', label: 'B', action: 'bold', style: { fontWeight: '700' } },
  { type: 'text', label: 'I', action: 'italic', style: { fontStyle: 'italic' } },
  { type: 'text', label: 'S', action: 'strike', style: { textDecorationLine: 'line-through' } },
  { type: 'text', label: 'H1', action: 'h1' },
  { type: 'text', label: 'H2', action: 'h2' },
  { type: 'text', label: 'H3', action: 'h3' },
  { type: 'icon', Icon: List, action: 'bullet' },
  { type: 'icon', Icon: ListOrdered, action: 'ordered' },
  { type: 'icon', Icon: Code, action: 'code' },
  { type: 'icon', Icon: Quote, action: 'quote' },
]

function ToolbarButton({ def, onAction, iconColor }: { def: ButtonDef; onAction: (a: ToolbarAction) => void; iconColor: string }) {
  return (
    <TouchableOpacity
      onPress={() => onAction(def.action)}
      activeOpacity={0.5}
      style={styles.button}
    >
      {def.type === 'text' ? (
        // className handles colour; def.style handles bold/italic/strike formatting override only
        <Text className="text-ink-subtle text-[14px]" style={def.style}>
          {def.label}
        </Text>
      ) : (
        <def.Icon size={18} color={iconColor} strokeWidth={1.5} />
      )}
    </TouchableOpacity>
  )
}

export function MarkdownToolbar({ onAction }: Props) {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  return (
    // bg-surface via className; hairline top border (themed) via StyleSheet (platform-specific width)
    <View
      className="bg-surface px-1 pt-[6px]"
      style={{
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.divider,
        paddingBottom: insets.bottom + 30,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        style={styles.rowScroll}
      >
        {ACTIONS.map((def) => (
          <ToolbarButton key={def.action} def={def} onAction={onAction} iconColor={colors.icon} />
        ))}
      </ScrollView>
    </View>
  )
}

// StyleSheet kept only for values NativeWind cannot express:
// — StyleSheet.hairlineWidth (platform-specific sub-pixel border)
// — layout constants (minWidth, height, gap, borderRadius, paddingHorizontal)
const styles = StyleSheet.create({
  rowScroll: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 2,
  },
  button: {
    minWidth: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: 6,
  },
})
