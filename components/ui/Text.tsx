import { cn } from '@/lib/cn'
import { Text as RNText, TextProps as RNTextProps } from 'react-native'

type Variant = 'wordmark' | 'heading' | 'heading-sm' | 'title' | 'body' | 'caption' | 'label'

export type TextProps = RNTextProps & {
  variant?: Variant
  muted?: boolean
  // Pass inverted when rendering on a dark/black background — produces white text via the
  // surface token. Use className="text-*" for any other color override; tailwind-merge
  // deduplicates conflicting text-* classes so the last one always wins.
  inverted?: boolean
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

export function Text({ variant = 'body', muted, inverted, className, ...props }: TextProps) {
  return (
    <RNText
      className={cn(
        variantClasses[variant],
        muted && 'text-ink-muted',
        inverted && 'text-surface',
        className,
      )}
      {...props}
    />
  )
}
