import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/theme';

import { sketchRoute, type SketchPoint } from './sketch';

/** Simple line drawing of the recorded route on a faint grid — no map underneath (S-07b). */
export function RouteSketch({ points, height, live }: { points: SketchPoint[]; height: number; live: boolean }) {
  const { colors, dark } = useTheme();
  const [w, setW] = useState(0);
  const s = useMemo(() => (w > 0 ? sketchRoute(points, w, height, 32) : null), [points, w, height]);
  const route = dark ? colors.text : '#1F2A44';
  const startFill = dark ? colors.incomeButton : colors.income;
  const grid = [height * 0.21, height * 0.48, height * 0.76].map((y) => `M0 ${y.toFixed(0)}H${w}`).join(' ');
  const vgrid = [0.23, 0.54, 0.83].map((x) => `M${(w * x).toFixed(0)} 0V${height}`).join(' ');
  return (
    <View style={{ flex: 1 }} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {s ? (
        <Svg width={w} height={height}>
          <Path d={`${grid} ${vgrid}`} stroke={colors.surfaceAlt} strokeWidth={1.5} />
          {s.gaps.map((d, i) => (
            <Path key={`g${i}`} d={d} fill="none" stroke={colors.lineStrong} strokeDasharray="2 12" strokeLinecap="round" strokeWidth={6} />
          ))}
          {s.segments.map((d, i) => (
            <Path key={`s${i}`} d={d} fill="none" stroke={route} strokeLinecap="round" strokeLinejoin="round" strokeWidth={6} />
          ))}
          {s.start ? <Circle cx={s.start.x} cy={s.start.y} r={9} fill={startFill} stroke={colors.surface} strokeWidth={4} /> : null}
          {s.end && live && s.segments.length > 0 ? (
            <>
              <Circle cx={s.end.x} cy={s.end.y} r={14} fill="#F5B841" opacity={0.35} />
              <Circle cx={s.end.x} cy={s.end.y} r={8} fill="#F5B841" stroke={dark ? undefined : '#1F2A44'} strokeWidth={dark ? 0 : 3} />
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}
