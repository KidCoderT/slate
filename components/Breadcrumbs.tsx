import { Ionicons } from '@expo/vector-icons'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import type { Breadcrumb } from '@/lib/dummyData'

type Props = {
  crumbs: Breadcrumb[]
  onCrumbPress: (crumb: Breadcrumb) => void
}

export function Breadcrumbs({ crumbs, onCrumbPress }: Props) {
  const router = useRouter()

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {/* Back chevron — navigates to previous screen in the stack */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 4 }}
        style={{ marginRight: 6 }}
      >
        <Ionicons name="chevron-back" size={18} color="#ADADAB" />
      </TouchableOpacity>

      {/* Crumb path */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', alignItems: 'center' }}
      >
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <View
              key={crumb.id ?? '__home__'}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              {index > 0 && (
                <Text
                  style={{
                    fontSize: 13,
                    color: '#D4D4D2',
                    marginHorizontal: 6,
                    lineHeight: 18,
                  }}
                >
                  ›
                </Text>
              )}
              <TouchableOpacity
                onPress={() => !isLast && onCrumbPress(crumb)}
                disabled={isLast}
                activeOpacity={0.6}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isLast ? '600' : '400',
                    color: isLast ? '#1A1A1A' : '#ADADAB',
                    lineHeight: 18,
                  }}
                >
                  {crumb.name}
                </Text>
              </TouchableOpacity>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}
