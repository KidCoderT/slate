import { cn } from '@/lib/cn'
import { fonts } from '@/theme/fonts'
import { Text as RNText, TextProps as RNTextProps } from 'react-native'

// Direction C type scale (APP_AESTHETIC §3). Display roles = Space Grotesk, read/UI = Geist.
// Weight lives in the font family (per-weight static fonts), so no fontWeight classes here.
type Variant =
  | 'wordmark'    // Space Grotesk 700 — the brand
  | 'heading'     // Space Grotesk 600 — page/hero title
  | 'heading-sm'  // Space Grotesk 600 — section heading
  | 'title'       // Geist 600 — note/card title
  | 'body'        // Geist 400
  | 'reading'     // Geist 400 — note editor reading size
  | 'caption'     // Geist 400 muted — meta
  | 'label'       // Geist 500 — wide-tracked ALL CAPS section label

export type TextProps = RNTextProps & {
  variant?: Variant
  muted?: boolean
  // Pass inverted when rendering on an `ink` (near-white) fill — produces dark text (Direction B:
  // the strong fill is light). Use className="text-*" for any other colour override; tailwind-merge
  // dedupes text-* classes.
  inverted?: boolean
  className?: string
}

const variantClasses: Record<Variant, string> = {
  wordmark:     'text-[36px] text-ink tracking-[-1.5px] leading-snug',
  heading:      'text-[32px] text-ink tracking-[-1px] leading-snug',
  'heading-sm': 'text-[20px] text-ink tracking-[-0.4px] leading-snug',
  title:        'text-[16px] text-ink tracking-[-0.2px]',
  body:         'text-[16px] text-ink leading-relaxed',
  reading:      'text-[17px] text-ink',
  caption:      'text-[13px] text-ink-muted',
  label:        'text-[12px] text-ink-muted uppercase tracking-[1px]',
}

const variantFont: Record<Variant, string> = {
  wordmark:     fonts.displayBold,
  heading:      fonts.display,
  'heading-sm': fonts.display,
  title:        fonts.uiSemibold,
  body:         fonts.ui,
  reading:      fonts.ui,
  caption:      fonts.ui,
  label:        fonts.uiMedium,
}

export function Text({ variant = 'body', muted, inverted, className, style, ...props }: TextProps) {
  return (
    <RNText
      className={cn(
        variantClasses[variant],
        muted && 'text-ink-muted',
        inverted && 'text-canvas',
        className,
      )}
      style={[{ fontFamily: variantFont[variant] }, style]}
      {...props}
    />
  )
}
