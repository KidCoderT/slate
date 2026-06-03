import { Text } from '@/components/ui/Text'
import { ChevronLeft } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import type { Breadcrumb } from '@/lib/dummyData'

type Props = {
  crumbs: Breadcrumb[]
  onCrumbPress: (crumb: Breadcrumb) => void
}

export function Breadcrumbs({ crumbs, onCrumbPress }: Props) {
  const router = useRouter()

  return (
    <View className="flex-row items-center">
      <TouchableOpacity
        onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 4 }}
        className="mr-[6px]"
      >
        <ChevronLeft size={18} color="#ADADAB" /* token: icon */ strokeWidth={1.5} />
      </TouchableOpacity>

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
              className="flex-row items-center"
            >
              {index > 0 && (
                <Text className="text-crumb text-[13px] mx-[6px] leading-[18px]">
                  ›
                </Text>
              )}
              <TouchableOpacity
                onPress={() => !isLast && onCrumbPress(crumb)}
                disabled={isLast}
                activeOpacity={0.6}
              >
                <Text
                  className={
                    isLast
                      ? 'text-ink font-semibold text-[13px] leading-[18px]'
                      : 'text-icon text-[13px] leading-[18px]'
                  }
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
