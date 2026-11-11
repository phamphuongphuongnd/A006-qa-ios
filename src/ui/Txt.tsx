import { Text, type TextProps } from 'react-native';

import { type ColorName, type TypeName, type as typeScale, useTheme } from '@/theme';

/**
 * Text with a mockup type style and a theme colour name.
 * `<Txt v="h1">`, `<Txt v="small" c="textSecondary">`, `<Txt v="amount" c="incomeText" size={17}>`.
 */
export function Txt({
  v = 'body',
  c = 'text',
  size,
  center,
  style,
  ...rest
}: TextProps & { v?: TypeName; c?: ColorName; size?: number; center?: boolean }) {
  const { colors } = useTheme();
  const base = typeScale[v];
  return (
    <Text
      maxFontSizeMultiplier={2}
      {...rest}
      style={[
        base,
        { color: colors[c] },
        size !== undefined && { fontSize: size, lineHeight: Math.round(size * 1.2) },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}
