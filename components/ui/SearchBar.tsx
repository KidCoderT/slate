import { Search } from 'lucide-react-native'
import { TextInput, View } from 'react-native'

type Props = {
  value: string
  onChangeText: (text: string) => void
}

export function SearchBar({ value, onChangeText }: Props) {
  return (
    <View className="flex-row items-center bg-search-bg rounded-2xl px-4 py-3">
      <Search size={17} color="#B4B6BB" /* token: placeholder */ strokeWidth={1.5} />
      <TextInput
        placeholder="Search notes..."
        placeholderTextColor="#B4B6BB" /* token: placeholder — TextInput requires a literal string */
        value={value}
        onChangeText={onChangeText}
        className="flex-1 ml-3 text-ink text-[15px]"
        style={{ outlineStyle: 'none' } as any /* web: suppress browser focus ring */}
      />
    </View>
  )
}
