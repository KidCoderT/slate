import { cn } from '@/lib/cn'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

type CardProps = {
  children: React.ReactNode
  className?: string
  noPad?: boolean
  onPress?: () => void
}

// StyleSheet required for shadow — NativeWind cannot express shadowOpacity/shadowRadius on React Native
const shadow = StyleSheet.create({
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
})

export function Card({ children, className, noPad, onPress }: CardProps) {
  const base = cn('bg-surface rounded-2xl overflow-hidden', !noPad && 'p-4', className)

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={shadow.base} className={base}>
        {children}
      </TouchableOpacity>
    )
  }

  return (
    <View style={shadow.base} className={base}>
      {children}
    </View>
  )
}
