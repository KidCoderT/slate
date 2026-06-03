import { StyleSheet, View } from 'react-native'

type DividerProps = {
  inset?: number
}

export function Divider({ inset = 16 }: DividerProps) {
  return (
    <View
      className="bg-divider"
      // StyleSheet.hairlineWidth is a platform-specific value — valid StyleSheet use
      style={{ height: StyleSheet.hairlineWidth, marginLeft: inset, marginRight: inset }}
    />
  )
}
