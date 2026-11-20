import { useWindowDimensions } from "react-native";

import { CONTENT_MAX, GUTTER, type ColorName } from "@/theme";

import { Txt } from "./Txt";

/**
 * B-110 (320dp + 200% text): a label and its figure side by side don't fit — flex wrapping didn't help on Android
 * (labels broke into syllables, figures were cut). Below this many dp per text-scale unit, rows stack instead.
 */
const STACK_BELOW = 240;

export function useStackedRows(): boolean {
  const { width, fontScale } = useWindowDimensions();
  return Math.min(width, CONTENT_MAX) / fontScale < STACK_BELOW;
}

/**
 * A money / distance figure that never runs off a card: its normal size grown with the text setting, but no wider than
 * the card (`inset` = everything around the text: screen gutters + card padding).
 */
export function FitFigure({
  value,
  size,
  c,
  inset = 2 * GUTTER + 32,
}: {
  value: string;
  size: number;
  c?: ColorName;
  inset?: number;
}) {
  const { width: windowWidth, fontScale } = useWindowDimensions();
  // B-146: the content column, not the window (an iPad window is 1032pt wide, the column 640).
  const width = Math.min(windowWidth, CONTENT_MAX);
  const px = Math.round(
    Math.min(
      size * Math.min(fontScale, 2),
      (width - inset) / (Math.max(4, value.length) * 0.62),
    ),
  );
  return (
    <Txt
      v="amount"
      c={c}
      maxFontSizeMultiplier={1}
      numberOfLines={1}
      style={{ fontSize: px, lineHeight: Math.round(px * 1.2) }}
    >
      {value}
    </Txt>
  );
}
