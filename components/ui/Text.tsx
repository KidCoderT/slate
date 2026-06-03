import { cn } from '@/lib/cn'
import { Text as RNText, TextProps as RNTextProps } from 'react-native'

type Variant = 'wordmark' | 'heading' | 'heading-sm' | 'title' | 'body' | 'caption' | 'label'

export type TextProps = RNTextProps & {
  variant?: Variant
  muted?: boolean
  className?: string
}

const variantClasses: Record<Variant, string> = {
  // Caller must also set style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}
  wordmark:        'text-[38px] font-bold text-ink tracking-[-1.2px] leading-snug',
  heading:         'text-[30px] font-bold text-ink tracking-[-0.8px] leading-snug',
  'heading-sm':    'text-[20px] font-semibold text-ink tracking-[-0.4px] leading-snug',
  title:           'text-[15px] font-semibold text-ink tracking-[-0.2px]',
  body:            'text-[15px] font-normal text-ink leading-relaxed',
  caption:         'text-[13px] font-normal text-ink-muted',
  label:           'text-[11px] font-medium text-ink-muted uppercase tracking-[0.7px]',
}

export function Text({ variant = 'body', muted, className, ...props }: TextProps) {
  return (
    <RNText
      className={cn(variantClasses[variant], muted && 'text-ink-muted', className)}
      {...props}
    />
  )
}
