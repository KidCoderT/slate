import { StyleSheet } from 'react-native'

// StyleSheet required — NativeWind cannot express shadowOpacity/shadowRadius on React Native
export const shadows = StyleSheet.create({
  noteCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 3,
  },
  folderChip: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
})
