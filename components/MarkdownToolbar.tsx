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
  { type: 'text', label: 'B', action: 'bold', style: { fontWeight: '700' } },
  { type: 'text', label: 'I', action: 'italic', style: { fontStyle: 'italic' } },
  { type: 'text', label: 'S', action: 'strike', style: { textDecorationLine: 'line-through' } },
  { type: 'text', label: 'H1', action: 'h1' },
  { type: 'text', label: 'H2', action: 'h2' },
  { type: 'text', label: 'H3', action: 'h3' },
  { type: 'icon', icon: <List size={18} color="#ADADAB" strokeWidth={1.5} />, action: 'bullet' },
]

const ROW_2: ButtonDef[] = [
  { type: 'icon', icon: <ListOrdered size={18} color="#ADADAB" strokeWidth={1.5} />, action: 'ordered' },
  { type: 'icon', icon: <Code size={18} color="#ADADAB" strokeWidth={1.5} />, action: 'code' },
  { type: 'icon', icon: <Quote size={18} color="#ADADAB" strokeWidth={1.5} />, action: 'quote' },
  { type: 'icon', icon: <Link2 size={18} color="#ADADAB" strokeWidth={1.5} />, action: 'quote' },
]

function ToolbarButton({ def, onAction }: { def: ButtonDef; onAction: (a: ToolbarAction) => void }) {
  return (
    <TouchableOpacity
      onPress={() => onAction(def.action)}
      activeOpacity={0.5}
      style={styles.button}
    >
      {def.type === 'text' ? (
        <Text style={[styles.buttonText, def.style]}>
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
    <View style={[styles.container, { paddingBottom: insets.bottom + 6 }]}>
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

      <View style={styles.separator} />

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

const styles = StyleSheet.create({
  container: {
    backgroundColor:   '#FFFFFF',           // surface token
    borderTopWidth:    StyleSheet.hairlineWidth,
    borderTopColor:    '#E8E8E6',           // divider token
    paddingHorizontal: 4,
    paddingTop:        6,
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
  separator: {
    height:           StyleSheet.hairlineWidth,
    backgroundColor:  '#E8E8E6',           // divider token
    marginVertical:   4,
    marginHorizontal: 16,
  },
  button: {
    minWidth:          36,
    height:            32,
    alignItems:        'center',
    justifyContent:    'center',
    borderRadius:      6,
    paddingHorizontal: 6,
  },
  buttonText: {
    fontSize:     14,
    color:        '#6B6B6B',               // ink-subtle token
    letterSpacing: 0,
  },
})
