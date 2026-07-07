import { useThemeColors } from '@/theme/ThemeProvider'
import { fonts } from '@/theme/fonts'
import { Search } from 'lucide-react-native'
import { TextInput, View } from 'react-native'

type Props = {
  value: string
  onChangeText: (text: string) => void
}

export function SearchBar({ value, onChangeText }: Props) {
  const colors = useThemeColors()
  return (
    <View className="flex-row items-center bg-search-bg rounded-xl px-4 py-3">
      <Search size={17} color={colors.placeholder} strokeWidth={1.5} />
      <TextInput
        placeholder="Search notes..."
        placeholderTextColor={colors.placeholder}
        value={value}
        onChangeText={onChangeText}
        className="flex-1 ml-3 text-ink text-[15px]"
        style={{ fontFamily: fonts.ui, outlineStyle: 'none' } as any /* web: suppress browser focus ring */}
      />
    </View>
  )
}
