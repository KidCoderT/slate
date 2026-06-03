import React from 'react'
import { View } from 'react-native'

type Props<T> = {
  data: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string
  gap?: number
}

export function Grid<T>({ data, renderItem, keyExtractor, gap = 10 }: Props<T>) {
  const rows: T[][] = []
  for (let i = 0; i < data.length; i += 2) {
    rows.push(data.slice(i, i + 2))
  }

  return (
    <View style={{ gap }}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: 'row', gap }}>
          <View key={keyExtractor(row[0], rowIndex * 2)} style={{ flex: 1 }}>
            {renderItem(row[0], rowIndex * 2)}
          </View>
          <View
            key={row[1] ? keyExtractor(row[1], rowIndex * 2 + 1) : `__empty_${rowIndex}`}
            style={{ flex: 1 }}
          >
            {row[1] ? renderItem(row[1], rowIndex * 2 + 1) : null}
          </View>
        </View>
      ))}
    </View>
  )
}
