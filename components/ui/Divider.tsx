import { cn } from '@/lib/cn'
import { StyleSheet, View } from 'react-native'

type DividerProps = {
  inset?: number
  className?: string
}

export function Divider({ inset = 16, className }: DividerProps) {
  return (
    <View
      className={cn('bg-divider', className)}
      // StyleSheet.hairlineWidth is a platform-specific value — valid StyleSheet use
      style={{ height: StyleSheet.hairlineWidth, marginLeft: inset, marginRight: inset }}
    />
  )
}
