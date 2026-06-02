import { Text, TouchableOpacity } from 'react-native'

type Props = {
  initial: string
  onPress: () => void
}

export function ProfileButton({ initial, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: 14,
          fontWeight: '600',
          letterSpacing: 0.3,
        }}
      >
        {initial}
      </Text>
    </TouchableOpacity>
  )
}
