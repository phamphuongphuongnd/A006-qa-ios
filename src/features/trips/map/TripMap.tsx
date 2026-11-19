import { Camera, GeoJSONSource, Layer, Map as MapView, Marker } from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n';
import { fonts, useTheme } from '@/theme';
import { MapPin } from '@/ui/icons';

import type { SegmentRange } from '../auto/stops';
import { boundsOf, linesFeatureCollection, tripLines, type LngLat, type MapPoint } from './geo';
import { mapStyleUrl, PIN } from './style';

/** No "map loaded" within this time (offline, tiles blocked) → show the sketch instead. */
const LOAD_TIMEOUT_MS = 12_000;
const STOP_R = 13;

/**
 * Real map of a trip (Q25: MapLibre + OpenFreeMap, free, no key). Route drawn on the phone: Work blue, Personal
 * purple-grey, green dot at the start, red pin at the end, numbered Stops (tap → `onStop`), fitted to the route.
 * `line` instead of `points` draws an A → B driving route preview. Load error / offline → `fallback` (the sketch).
 */
export function TripMap({
  points = [],
  line,
  stops = [],
  personal = [],
  allPersonal = false,
  height,
  interactive = false,
  live = false,
  stopLabel,
  onStop,
  fallback,
}: {
  points?: MapPoint[];
  /** A → B route preview, [lng, lat] pairs. */
  line?: LngLat[];
  stops?: { lat: number; lng: number }[];
  personal?: SegmentRange[];
  allPersonal?: boolean;
  height: number;
  /** Drag / pinch (S-07c). Small maps stay still. */
  interactive?: boolean;
  /** Active trip: no end pin, camera follows the growing route. */
  live?: boolean;
  stopLabel?: (i: number) => string;
  onStop?: (i: number) => void;
  fallback: ReactNode;
}) {
  const { colors, dark } = useTheme();
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  const lines = useMemo(() => {
    if (line) {
      return {
        work: line.length >= 2 ? [line] : [],
        personal: [],
        gaps: [],
        start: line[0] ?? null,
        end: line[line.length - 1] ?? null,
        bounds: boundsOf(line),
      };
    }
    return tripLines(points, personal, allPersonal, stops);
  }, [line, points, personal, allPersonal, stops]);
  const shape = useMemo(() => linesFeatureCollection(lines), [lines]);
  const hasBounds = !!lines.bounds;

  // QA QI-6 (iOS simulator, also Android): the load timer ran from mount, before the first GPS fix — a cold GPS slower
  // than LOAD_TIMEOUT_MS meant no map for the whole trip. It only counts once the map is actually drawn.
  useEffect(() => {
    if (state !== 'loading' || !hasBounds) return;
    const timer = setTimeout(() => setState((s) => (s === 'loading' ? 'failed' : s)), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [state, hasBounds]);

  if (state === 'failed' || !lines.bounds) return <>{fallback}</>;

  const pad = Math.min(48, height / 5);
  // The end pin stands 34dp above its point: leave room for it at the top.
  const padding = { top: live ? pad : pad + 30, right: pad, bottom: pad, left: pad };
  const casing = dark ? '#12161C' : '#FFFFFF';
  return (
    <View style={{ height }} accessibilityLabel={t('autoTrip.map.a11y')}>
      <MapView
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyleUrl(dark)}
        attribution={false}
        logo={false}
        compass={interactive}
        scaleBar={false}
        dragPan={interactive}
        touchZoom={interactive}
        doubleTapZoom={interactive}
        doubleTapHoldZoom={interactive}
        touchRotate={false}
        touchPitch={false}
        onDidFinishLoadingMap={() => setState('ready')}
        onDidFailLoadingMap={() => setState('failed')}>
        {live ? (
          <Camera bounds={lines.bounds} padding={padding} duration={600} easing="ease" />
        ) : (
          <Camera initialViewState={{ bounds: lines.bounds, padding }} />
        )}
        <GeoJSONSource id="trip" data={shape}>
          <Layer
            type="line"
            id="trip-casing"
            filter={['!=', ['get', 'kind'], 'gap']}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': casing, 'line-width': 9, 'line-opacity': 0.9 }}
          />
          <Layer
            type="line"
            id="trip-gap"
            filter={['==', ['get', 'kind'], 'gap']}
            layout={{ 'line-cap': 'round' }}
            paint={{ 'line-color': colors.lineStrong, 'line-width': 4, 'line-dasharray': [0.5, 2.5] }}
          />
          <Layer
            type="line"
            id="trip-work"
            filter={['==', ['get', 'kind'], 'work']}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': colors.workFill, 'line-width': 5 }}
          />
          <Layer
            type="line"
            id="trip-personal"
            filter={['==', ['get', 'kind'], 'personal']}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': colors.personalFill, 'line-width': 5, 'line-dasharray': [1, 1.6] }}
          />
        </GeoJSONSource>

        {lines.start ? (
          <Marker id="start" lngLat={lines.start}>
            <View style={[styles.startDot, { backgroundColor: PIN.start, borderColor: PIN.ring }]} />
          </Marker>
        ) : null}
        {lines.end && !live ? (
          <Marker id="end" lngLat={lines.end} anchor="bottom">
            <MapPin size={34} color={PIN.ring} fill={PIN.end} strokeWidth={1.5} />
          </Marker>
        ) : null}
        {lines.end && live ? (
          <Marker id="here" lngLat={lines.end}>
            <View style={styles.hereHalo}>
              <View style={[styles.hereDot, { borderColor: dark ? '#12161C' : '#1F2A44' }]} />
            </View>
          </Marker>
        ) : null}
        {stops.map((s, i) => (
          <Marker key={`s${i}`} id={`stop${i}`} lngLat={[s.lng, s.lat]} onPress={onStop ? () => onStop(i) : undefined}>
            <View
              accessible
              accessibilityRole={onStop ? 'button' : undefined}
              accessibilityLabel={stopLabel?.(i)}
              style={styles.stopHit}>
              <View style={[styles.stop, { backgroundColor: colors.surface, borderColor: dark ? colors.text : '#1F2A44' }]}>
                <Text maxFontSizeMultiplier={1} style={{ color: colors.text, fontSize: 12, fontFamily: fonts.bold }}>
                  {i + 1}
                </Text>
              </View>
            </View>
          </Marker>
        ))}
      </MapView>
      <View pointerEvents="none" style={[styles.attr, { backgroundColor: dark ? 'rgba(18,22,28,0.7)' : 'rgba(255,255,255,0.75)' }]}>
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 10, color: colors.textSecondary, fontFamily: fonts.regular }}>
          {t('autoTrip.map.attribution')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  startDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 3 },
  hereHalo: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(245,184,65,0.35)', alignItems: 'center', justifyContent: 'center' },
  hereDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#F5B841', borderWidth: 3 },
  // 44dp tap target around a 26dp numbered circle.
  stopHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stop: { width: STOP_R * 2, height: STOP_R * 2, borderRadius: STOP_R, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  attr: { position: 'absolute', right: 0, bottom: 0, paddingHorizontal: 6, paddingVertical: 2, borderTopLeftRadius: 6 },
});
