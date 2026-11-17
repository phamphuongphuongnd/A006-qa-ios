import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

/** Line illustrations copied from the Hi-Fi mockup SVGs. Navy strokes follow the theme text colour in dark mode. */

/** `scale` < 1 on short screens / big text (QA-100 iOS: iPhone SE + large Dynamic Type cut the welcome text off). */
export function WelcomeArt({ scale = 1 }: { scale?: number } = {}) {
  const { colors, dark } = useTheme();
  const ink = dark ? colors.text : '#1F2A44';
  const paper = dark ? colors.surface : '#fff';
  return (
    <Svg width={320 * scale} height={220 * scale} viewBox="0 0 320 220" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={236} cy={72} r={34} fill="#F5B841" />
      <Path d="M236 20v10M236 114v10M184 72h10M278 72h10M199 35l7 7M266 102l7 7M199 109l7-7M266 42l7-7" stroke="#F5B841" strokeLinecap="round" strokeWidth={5} />
      <Path d="M20 186h280" stroke={ink} strokeLinecap="round" strokeWidth={3} />
      <Path d="M44 170V100a10 10 0 0 1 10-10h128v80z" fill={paper} stroke={ink} strokeLinejoin="round" strokeWidth={3.5} />
      <Path d="M182 106h40l26 32v32h-66z" fill={paper} stroke={ink} strokeLinejoin="round" strokeWidth={3.5} />
      <Path d="M190 114h28l18 22h-46z" fill={dark ? colors.surfaceAlt : '#DCE6F5'} stroke={ink} strokeLinejoin="round" strokeWidth={3} />
      <Path d="M46 142h136" stroke="#F5B841" strokeWidth={6} />
      <Circle cx={84} cy={172} r={16} fill={colors.background} stroke={ink} strokeWidth={3.5} />
      <Circle cx={84} cy={172} r={5} fill={ink} />
      <Circle cx={214} cy={172} r={16} fill={colors.background} stroke={ink} strokeWidth={3.5} />
      <Circle cx={214} cy={172} r={5} fill={ink} />
      <G transform="rotate(-8 122 52)">
        <Path d="M104 30h36v44l-6-4-6 4-6-4-6 4-6-4-6 4z" fill={paper} stroke={ink} strokeLinejoin="round" strokeWidth={3} />
        <Path d="M112 42h20M112 52h20M112 62h11" stroke={ink} strokeLinecap="round" strokeWidth={2.5} />
      </G>
    </Svg>
  );
}

export function ReceiptCheckArt() {
  const { colors, dark } = useTheme();
  const ink = dark ? colors.text : '#1F2A44';
  return (
    <Svg width={150} height={120} viewBox="0 0 150 120" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={112} cy={30} r={18} fill="#F5B841" />
      <Path d="M40 12h56v92l-9.3-7-9.4 7-9.3-7-9.4 7-9.3-7-9.3 7z" fill={dark ? colors.surface : '#fff'} stroke={ink} strokeLinejoin="round" strokeWidth={3} />
      <Path d="M52 32h32M52 46h32M52 60h20" stroke={ink} strokeLinecap="round" strokeWidth={3} />
      <Path d="M70 76l6 6 12-13" fill="none" stroke="#C98A12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} />
    </Svg>
  );
}

export function DownArrowArt() {
  return (
    <Svg width={40} height={56} viewBox="0 0 40 56" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M20 4c-8 14 8 26 0 44M10 40l10 10 10-10" fill="none" stroke="#C98A12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} />
    </Svg>
  );
}

export function SunDoneArt() {
  const { colors, dark } = useTheme();
  const ink = dark ? colors.text : '#1F2A44';
  return (
    <Svg width={200} height={140} viewBox="0 0 200 140" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M20 120h160" stroke={ink} strokeLinecap="round" strokeWidth={3} />
      <Path d="M44 120a56 56 0 0 1 112 0z" fill="#F5B841" />
      <Path d="M100 22v18M40 52l13 12M160 52l-13 12M18 92h18M164 92h18" stroke="#F5B841" strokeLinecap="round" strokeWidth={6} />
      <Path d="M78 100l14 14 30-32" fill="none" stroke="#1F2A44" strokeLinecap="round" strokeLinejoin="round" strokeWidth={7} />
    </Svg>
  );
}

export function SunIcon({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#C98A12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}>
      <Path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </Svg>
  );
}

export function FlagUK() {
  return (
    <Svg width={44} height={30} viewBox="0 0 60 40">
      <Rect width={60} height={40} fill="#012169" />
      <Path d="M0 0l60 40M60 0L0 40" stroke="#fff" strokeWidth={8} />
      <Path d="M0 0l60 40M60 0L0 40" stroke="#C8102E" strokeWidth={3} />
      <Path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth={12} />
      <Path d="M30 0v40M0 20h60" stroke="#C8102E" strokeWidth={7} />
    </Svg>
  );
}

export function FlagUS() {
  return (
    <Svg width={44} height={30} viewBox="0 0 60 40">
      <Rect width={60} height={40} fill="#fff" />
      <Path d="M0 3h60M0 9h60M0 15h60M0 21h60M0 27h60M0 33h60M0 39h60" stroke="#B22234" strokeWidth={3.1} />
      <Rect width={26} height={21.5} fill="#3C3B6E" />
    </Svg>
  );
}

export function AppIconMini() {
  return (
    <Svg width={36} height={36} viewBox="0 0 120 120">
      <Rect width={120} height={120} rx={28} fill="#1F2A44" />
      <Circle cx={84} cy={38} r={17} fill="#F5B841" />
      <Path d="M30 24h44v70l-7.3-5.5-7.4 5.5-7.3-5.5-7.4 5.5-7.3-5.5-7.3 5.5z" fill="#FAF8F4" />
    </Svg>
  );
}
