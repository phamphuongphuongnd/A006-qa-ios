import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { fonts, useTheme } from '@/theme';

import { sketchTripDetail, type DetailPoint } from '../auto/detailSketch';
import type { SegmentRange } from '../auto/stops';

const STOP_R = 13;

/**
 * S-07c route drawing: Work runs solid blue, Personal runs dotted purple-grey, Stops as numbered circles you can tap.
 * No map underneath (like S-07b).
 */
export function TripDetailSketch({
  points,
  stops,
  personal,
  allPersonal,
  height,
  stopLabel,
  onStop,
}: {
  points: DetailPoint[];
  stops: { lat: number; lng: number }[];
  personal: SegmentRange[];
  allPersonal: boolean;
  height: number;
  /** Accessible name of stop i (0-based). */
  stopLabel: (i: number) => string;
  onStop: (i: number) => void;
}) {
  const { colors, dark } = useTheme();
  const [w, setW] = useState(0);
  const s = useMemo(
    () => (w > 0 ? sketchTripDetail(points, stops, personal, allPersonal, w, height, 30) : null),
    [points, stops, personal, allPersonal, w, height],
  );
  const work = colors.workFill;
  const pers = colors.personalFill;
  const dotFill = dark ? colors.text : '#1F2A44';
  return (
    <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {s ? (
        <>
          <Svg width={w} height={height} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {/* Soft halo under the whole route, as in the mockup. */}
            {[...s.work, ...s.personal].map((d, i) => (
              <Path key={`h${i}`} d={d} fill="none" stroke={colors.lineStrong} strokeOpacity={0.5} strokeLinecap="round" strokeLinejoin="round" strokeWidth={11} />
            ))}
            {s.gaps.map((d, i) => (
              <Path key={`g${i}`} d={d} fill="none" stroke={colors.lineStrong} strokeDasharray="2 10" strokeLinecap="round" strokeWidth={5} />
            ))}
            {s.work.map((d, i) => (
              <Path key={`w${i}`} d={d} fill="none" stroke={work} strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} />
            ))}
            {s.personal.map((d, i) => (
              <Path key={`p${i}`} d={d} fill="none" stroke={pers} strokeDasharray="1 9" strokeLinecap="round" strokeLinejoin="round" strokeWidth={6} />
            ))}
            {s.start ? <Circle cx={s.start.x} cy={s.start.y} r={7} fill={dotFill} /> : null}
            {s.end ? <Rect x={s.end.x - 8} y={s.end.y - 8} width={16} height={16} rx={3} fill={dotFill} /> : null}
          </Svg>
          {s.stops.map((p, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={stopLabel(i)}
              onPress={() => onStop(i)}
              hitSlop={6}
              style={[styles.stopHit, { left: p.x - 22, top: p.y - 22 }]}>
              <View style={[styles.stop, { backgroundColor: colors.surface, borderColor: dotFill }]}>
                <Text maxFontSizeMultiplier={1} style={{ color: colors.text, fontSize: 12, fontFamily: fonts.bold }}>
                  {i + 1}
                </Text>
              </View>
            </Pressable>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stopHit: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stop: {
    width: STOP_R * 2,
    height: STOP_R * 2,
    borderRadius: STOP_R,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
