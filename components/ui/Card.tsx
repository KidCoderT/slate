import { cn } from '@/lib/cn'
import { TouchableOpacity, View } from 'react-native'

type CardProps = {
  children: React.ReactNode
  className?: string
  noPad?: boolean
  onPress?: () => void
}

// Direction C materials: surfaces are separated by a 1px `divider` border on `canvas`,
// NOT by a shadow (APP_AESTHETIC §6). Tighter `rounded-xl` for the cut-stone feel (§4).
export function Card({ children, className, noPad, onPress }: CardProps) {
  const base = cn(
    'bg-surface rounded-xl border border-divider overflow-hidden',
    !noPad && 'p-4',
    className,
  )

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.88} className={base}>
        {children}
      </TouchableOpacity>
    )
  }

  return <View className={base}>{children}</View>
}
