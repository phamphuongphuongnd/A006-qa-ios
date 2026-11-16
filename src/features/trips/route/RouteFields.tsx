'use no memo';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { db } from '@/db/client';
import type { RoutePlace } from '@/db/tripsRepo';
import type { Region } from '@/domain/types';
import { t } from '@/i18n';
import { fonts, radius, useTheme } from '@/theme';
import { Card, Chip, ChipRow, Field, IconButton, Toggle, Txt } from '@/ui';
import { LocateFixed, MapPin, X } from '@/ui/icons';

import { formatDistance, type DistanceUnit } from '../format';
import { TripMap } from '../map/TripMap';
import { routeMiles, samePlace, type RouteFormState } from '../tripFormCheck';
import { drivingRoute, MIN_QUERY, OrsError, reversePlace, suggestPlaces, type PlaceHit } from './ors';
import { listPlaces } from './places';

type End = 'from' | 'to';
const DEBOUNCE_MS = 400;

const routeKey = (r: RouteFormState) => (r.from && r.to ? `${r.from.lat},${r.from.lng}>${r.to.lat},${r.to.lng}` : null);

/**
 * S-08 "A → B" (Q25, Pro): From (+ "Current location") · To · suggestions from 3 letters · Frequent places chips ·
 * Round trip · "= 12.4 mi · Driving route" + map preview. No internet / service limit → `onOffline` (the form switches
 * to Distance with "No internet — enter miles instead").
 */
export function RouteFields({
  value,
  setRoute,
  region,
  unit,
  error,
  onOffline,
}: {
  value: RouteFormState;
  setRoute: (fn: (r: RouteFormState) => RouteFormState) => void;
  region: Region;
  unit: DistanceUnit;
  /** From the form check ("From and To are the same place"). */
  error: string | null;
  onOffline: () => void;
}) {
  const { colors } = useTheme();
  const [text, setText] = useState<Record<End, string>>({ from: '', to: '' });
  const [focus, setFocus] = useState<End | null>(null);
  const [found, setFound] = useState<{ q: string; hits: PlaceHit[] }>({ q: '', hits: [] });
  const [locating, setLocating] = useState(false);
  const [priced, setPriced] = useState<{ key: string; meters: number | null; line: [number, number][] | null; noRoute: boolean } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [frequent] = useState(() => listPlaces(db));

  // Suggestions while typing (debounced; older requests cancelled). Shown only for the text they answer.
  const query = focus ? text[focus].trim() : '';
  const active = !!focus && query.length >= MIN_QUERY;
  const hits = active && found.q === query ? found.hits : [];
  const searching = active && found.q !== query;
  useEffect(() => {
    if (!active) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      const near = value.from ?? value.to ?? frequent[0] ?? null;
      suggestPlaces(query, region, near, { signal: ctrl.signal })
        .then((h) => {
          if (!ctrl.signal.aborted) setFound({ q: query, hits: h });
        })
        .catch(() => {
          if (ctrl.signal.aborted) return;
          setFound({ q: query, hits: [] });
          onOffline();
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, query, region]);

  // Driving distance when both ends are set and not priced yet (an edited trip keeps its stored miles until From / To
  // change: `pick` / `clear` reset `meters`).
  const key = routeKey(value);
  const valid = !!key && !!value.from && !!value.to && !samePlace(value.from, value.to);
  const result = priced && priced.key === key ? priced : null;
  const routing = valid && value.meters === null && !result;
  const noRoute = !!result?.noRoute;
  const line = result?.line ?? null;
  useEffect(() => {
    if (!routing || !key || !value.from || !value.to) return;
    let alive = true;
    drivingRoute(value.from, value.to)
      .then((res) => {
        if (!alive) return;
        setPriced({ key, meters: res.meters, line: res.line, noRoute: false });
        setRoute((r) => (routeKey(r) === key ? { ...r, meters: res.meters } : r));
      })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof OrsError && e.kind === 'no_route') setPriced({ key, meters: null, line: null, noRoute: true });
        else onOffline();
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routing, key]);

  const pick = (end: End, p: RoutePlace) => {
    setRoute((r) => {
      const next = { ...r, [end]: { label: p.label, lat: p.lat, lng: p.lng }, meters: null };
      // The same pair as the last answer (picked again) keeps its distance — no second call.
      return priced && routeKey(next) === priced.key ? { ...next, meters: priced.meters } : next;
    });
    setText((x) => ({ ...x, [end]: '' }));
    setFocus(null);
  };

  const clear = (end: End) => {
    setRoute((r) => ({ ...r, [end]: null, meters: null }));
    setFocus(end);
  };

  const pickChip = (p: RoutePlace) => {
    const end: End = focus ?? (!value.from ? 'from' : 'to');
    pick(end, p);
  };

  const pickCurrent = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) throw new Error('denied');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const at = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      let label = t('autoTrip.route.currentLocation');
      try {
        label = (await reversePlace(at))?.label ?? label;
      } catch {
        onOffline();
        return;
      }
      pick('from', { label, ...at });
    } catch {
      setText((x) => ({ ...x, from: '' }));
      setLocationError(true);
    } finally {
      setLocating(false);
    }
  };

  const end = (which: End) => {
    const place = value[which];
    const label = which === 'from' ? t('autoTrip.route.from') : t('autoTrip.route.to');
    if (place) {
      return (
        <View style={{ gap: 6 }}>
          <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
            {label}
          </Txt>
          <View style={[styles.chosen, { backgroundColor: colors.surface, borderColor: colors.lineStrong }]}>
            <MapPin size={20} color={which === 'from' ? colors.income : colors.error} strokeWidth={2} />
            <Txt v="body" size={17} numberOfLines={1} style={{ flex: 1, fontFamily: fonts.semibold }}>
              {place.label}
            </Txt>
            <IconButton icon={X} label={t('autoTrip.route.clear', { field: label })} onPress={() => clear(which)} />
          </View>
        </View>
      );
    }
    const open = focus === which;
    return (
      <View style={{ gap: 8 }}>
        <Field
          label={label}
          value={text[which]}
          onChangeText={(s) => {
            setText((x) => ({ ...x, [which]: s }));
            if (which === 'from') setLocationError(false);
          }}
          onFocus={() => setFocus(which)}
          placeholder={which === 'from' ? t('autoTrip.route.fromPlaceholder') : t('autoTrip.route.toPlaceholder')}
          autoCorrect={false}
          returnKeyType="search"
          maxLength={80}
          right={open && searching ? <ActivityIndicator color={colors.textSecondary} /> : null}
        />
        {which === 'from' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('autoTrip.route.currentLocation')}
            onPress={pickCurrent}
            disabled={locating}
            style={({ pressed }) => [styles.current, { opacity: pressed || locating ? 0.6 : 1 }]}>
            {locating ? <ActivityIndicator color={colors.primary} /> : <LocateFixed size={20} color={colors.primary} strokeWidth={2} />}
            <Txt v="body" c="primary" style={{ fontFamily: fonts.semibold }}>
              {locating ? t('autoTrip.route.locating') : t('autoTrip.route.currentLocation')}
            </Txt>
          </Pressable>
        ) : null}
        {which === 'from' && locationError ? (
          <Txt v="small" c="error" accessibilityLiveRegion="polite">
            {t('autoTrip.route.noLocation')}
          </Txt>
        ) : null}
        {open && hits.length > 0 ? (
          <Card style={{ paddingVertical: 0, paddingHorizontal: 0 }}>
            {hits.map((h, i) => (
              <Pressable
                key={`${h.label}|${h.detail}|${i}`}
                accessibilityRole="button"
                accessibilityLabel={h.detail ? `${h.label}, ${h.detail}` : h.label}
                onPress={() => pick(which, h)}
                style={({ pressed }) => [
                  styles.hit,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
                  pressed && { backgroundColor: colors.surfaceAlt },
                ]}>
                <MapPin size={18} color={colors.textSecondary} strokeWidth={2} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt v="body" numberOfLines={1} style={{ fontFamily: fonts.semibold }}>
                    {h.label}
                  </Txt>
                  {h.detail ? (
                    <Txt v="small" c="textSecondary" numberOfLines={1}>
                      {h.detail}
                    </Txt>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </Card>
        ) : null}
        {open && !searching && query.length >= MIN_QUERY && hits.length === 0 ? (
          <Txt v="small" c="textSecondary" accessibilityLiveRegion="polite">
            {t('autoTrip.route.noResults')}
          </Txt>
        ) : null}
      </View>
    );
  };

  const miles = value.meters !== null ? routeMiles(value.meters, value.roundTrip) : null;
  const shownChips = frequent.filter((p) => !(value.from && samePlace(p, value.from)) && !(value.to && samePlace(p, value.to)));

  return (
    <View style={{ gap: 16 }}>
      {end('from')}
      {end('to')}

      {shownChips.length > 0 && (!value.from || !value.to || focus) ? (
        <View style={{ gap: 8 }}>
          <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
            {t('autoTrip.route.frequent')}
          </Txt>
          <ChipRow>
            {shownChips.map((p) => (
              <Chip key={p.id} label={p.label} icon={MapPin} accessibilityLabel={t('autoTrip.route.a11yChip', { label: p.label })} onPress={() => pickChip(p)} />
            ))}
          </ChipRow>
        </View>
      ) : null}

      <View style={styles.roundRow}>
        <View style={{ flex: 1 }}>
          <Txt v="body" style={{ fontFamily: fonts.semibold }}>
            {t('autoTrip.route.roundTrip')}
          </Txt>
          <Txt v="small" c="textSecondary">
            {t('autoTrip.route.roundTripSub')}
          </Txt>
        </View>
        <Toggle label={t('autoTrip.route.roundTrip')} value={value.roundTrip} onChange={(roundTrip) => setRoute((r) => ({ ...r, roundTrip }))} />
      </View>

      <Card style={{ backgroundColor: colors.surfaceAlt, borderWidth: 0, gap: 4 }}>
        {routing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={colors.textSecondary} />
            <Txt v="body" c="textSecondary">
              {t('autoTrip.route.working')}
            </Txt>
          </View>
        ) : noRoute ? (
          <Txt v="body" c="error" accessibilityLiveRegion="polite">
            {t('autoTrip.route.noRoute')}
          </Txt>
        ) : error ? (
          <Txt v="body" c="error" accessibilityLiveRegion="polite">
            {error}
          </Txt>
        ) : miles !== null ? (
          <Txt v="amount" size={24} accessibilityLiveRegion="polite">
            {t(value.roundTrip ? 'autoTrip.route.resultRound' : 'autoTrip.route.result', {
              distance: formatDistance(miles * 1609.344, unit, miles >= 100 ? 0 : 1),
            })}
          </Txt>
        ) : (
          <Txt v="body" c="textSecondary">
            {t('autoTrip.route.pickHint')}
          </Txt>
        )}
      </Card>

      {line && line.length >= 2 && !routing ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <TripMap line={line} height={180} fallback={null} />
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chosen: { minHeight: 56, borderRadius: radius.input, borderWidth: 1.5, paddingLeft: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  current: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start' },
  hit: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 8 },
  roundRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
});
