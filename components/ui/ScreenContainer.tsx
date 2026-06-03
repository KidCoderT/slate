import { cn } from '@/lib/cn'
import { Platform, View, ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type ScreenContainerProps = {
  children: React.ReactNode
  padded?: boolean
  className?: string
}

export function ScreenContainer({ children, padded, className }: ScreenContainerProps) {
  const innerStyle: ViewStyle =
    Platform.OS === 'web'
      ? { flex: 1, maxWidth: 680, width: '100%', alignSelf: 'center' }
      : { flex: 1 }

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <View style={innerStyle} className={cn(padded && 'px-[18px]', className)}>
        {children}
      </View>
    </SafeAreaView>
  )
}
