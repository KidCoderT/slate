import { Ionicons } from '@expo/vector-icons'
import { TextInput, View } from 'react-native'

type Props = {
  value: string
  onChangeText: (text: string) => void
}

export function SearchBar({ value, onChangeText }: Props) {
  return (
    <View
      className="flex-row items-center rounded-2xl px-4 py-3"
      style={{ backgroundColor: '#E6E7EA' }}
    >
      <Ionicons name="search-outline" size={17} color="#B4B6BB" />
      <TextInput
        placeholder="Search notes..."
        placeholderTextColor="#B4B6BB"
        value={value}
        onChangeText={onChangeText}
        className="flex-1 ml-3 text-ink text-[15px]"
        style={{ outlineStyle: 'none' } as any}
      />
    </View>
  )
}
