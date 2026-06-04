import { Divider } from '@/components/ui/Divider'
import { Text } from '@/components/ui/Text'
import { Code, Link2, List, ListOrdered, Quote } from 'lucide-react-native'
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
  | { type: 'icon'; icon: React.ReactNode; action: ToolbarAction }

const ROW_1: ButtonDef[] = [
  { type: 'text', label: 'B', action: 'bold',   style: { fontWeight: '700' } },
  { type: 'text', label: 'I', action: 'italic',  style: { fontStyle: 'italic' } },
  { type: 'text', label: 'S', action: 'strike',  style: { textDecorationLine: 'line-through' } },
  { type: 'text', label: 'H1', action: 'h1' },
  { type: 'text', label: 'H2', action: 'h2' },
  { type: 'text', label: 'H3', action: 'h3' },
  { type: 'icon', icon: <List size={18} color="#ADADAB" /* token: icon */ strokeWidth={1.5} />, action: 'bullet' },
]

const ROW_2: ButtonDef[] = [
  { type: 'icon', icon: <ListOrdered size={18} color="#ADADAB" /* token: icon */ strokeWidth={1.5} />, action: 'ordered' },
  { type: 'icon', icon: <Code        size={18} color="#ADADAB" /* token: icon */ strokeWidth={1.5} />, action: 'code' },
  { type: 'icon', icon: <Quote       size={18} color="#ADADAB" /* token: icon */ strokeWidth={1.5} />, action: 'quote' },
  { type: 'icon', icon: <Link2       size={18} color="#ADADAB" /* token: icon */ strokeWidth={1.5} />, action: 'quote' },
]

function ToolbarButton({ def, onAction }: { def: ButtonDef; onAction: (a: ToolbarAction) => void }) {
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
        def.icon
      )}
    </TouchableOpacity>
  )
}

export function MarkdownToolbar({ onAction }: Props) {
  const insets = useSafeAreaInsets()
  return (
    // bg-surface via className; borderTopWidth uses StyleSheet.hairlineWidth (platform-specific value)
    <View
      className="bg-surface px-1 pt-[6px]"
      style={[styles.border, { paddingBottom: insets.bottom + 6 }]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        style={styles.rowScroll}
      >
        {ROW_1.map((def, i) => (
          <ToolbarButton key={i} def={def} onAction={onAction} />
        ))}
      </ScrollView>

      <Divider inset={16} className="my-1" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        style={styles.rowScroll}
      >
        {ROW_2.map((def, i) => (
          <ToolbarButton key={i} def={def} onAction={onAction} />
        ))}
      </ScrollView>
    </View>
  )
}

// StyleSheet kept only for values NativeWind cannot express:
// — StyleSheet.hairlineWidth (platform-specific sub-pixel border)
// — layout constants (minWidth, height, gap, borderRadius, paddingHorizontal)
const styles = StyleSheet.create({
  border: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E8E6', // token: divider
  },
  rowScroll: {
    flexGrow: 0,
  },
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 8,
    gap:               2,
  },
  button: {
    minWidth:          36,
    height:            32,
    alignItems:        'center',
    justifyContent:    'center',
    borderRadius:      6,
    paddingHorizontal: 6,
  },
})
