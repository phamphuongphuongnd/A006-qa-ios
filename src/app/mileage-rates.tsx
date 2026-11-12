import { router } from '@/services/router';
import { ChevronLeft, Plus, Trash2 } from '@/ui/icons';
import { useState } from 'react';
import { View } from 'react-native';

import { DEFAULT_RATES, flattenPeriods, parseLocalDate, ratePeriods, toLocalDate, validatePeriods, type RatePeriod } from '@/domain/mileage';
import type { Region } from '@/domain/types';
import { formatDistanceNumber } from '@/domain/mileage';
import { formatLongDate, parseNumberInput } from '@/features/trips/format';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { fonts } from '@/theme';
import { Button, Card, Dialog, Field, IconButton, Screen, Txt, useSnackbar } from '@/ui';

interface DraftTier {
  upToMiles: number | null;
  text: string;
}
interface DraftPeriod {
  from: string | null;
  tiers: DraftTier[];
}

const toDraft = (periods: RatePeriod[]): DraftPeriod[] =>
  periods.map((p) => ({ from: p.from, tiers: p.tiers.map((x) => ({ upToMiles: x.upToMiles, text: String(x.minorPerMile) })) }));

const fromDraft = (d: DraftPeriod[]): RatePeriod[] =>
  d.map((p) => ({
    from: p.from === null ? null : p.from.trim(),
    tiers: p.tiers.map((x) => ({ upToMiles: x.upToMiles, minorPerMile: parseNumberInput(x.text) ?? NaN })),
  }));

/** Settings → "Mileage rates": date-ranged rates for the current region, "Reset to default". */
export default function MileageRatesScreen() {
  const { settings, update } = useSettings();
  const region: Region = settings.region ?? 'UK';
  const snack = useSnackbar();
  const [draft, setDraft] = useState<DraftPeriod[]>(() => toDraft(ratePeriods(settings.mileageRates[region])));
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const unit = region === 'UK' ? t('miles.ratesUnitUK') : t('miles.ratesUnitUS');

  const close = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  const edit = (pi: number, fn: (p: DraftPeriod) => DraftPeriod) => {
    setError(null);
    setDraft((d) => d.map((p, i) => (i === pi ? fn(p) : p)));
  };

  const save = () => {
    const periods = fromDraft(draft);
    const problem = validatePeriods(periods);
    if (problem) {
      setError(problem === 'rate_invalid' ? t('miles.ratesInvalid') : problem === 'date_invalid' ? t('miles.ratesDateInvalid') : t('miles.ratesDuplicate'));
      return;
    }
    update({ mileageRates: { ...settings.mileageRates, [region]: flattenPeriods(periods) } });
    snack({ message: t('miles.ratesSaved'), above: 'none' });
    close();
  };

  const addPeriod = () => {
    setError(null);
    setDraft((d) => {
      const last = d[d.length - 1];
      return [...d, { from: toLocalDate(Date.now()), tiers: last ? last.tiers.map((x) => ({ ...x })) : [{ upToMiles: null, text: '' }] }];
    });
  };

  return (
    <Screen
      title={t('miles.ratesTitle')}
      headerLeft={<IconButton icon={ChevronLeft} label={t('trip.back')} onPress={close} />}
      bottomInset
      bottom={<Button label={t('common.save')} full style={{ flex: 1 }} onPress={save} />}>
      <Txt v="body" c="textSecondary">
        {t('miles.ratesIntro')}
      </Txt>
      {draft.map((p, pi) => {
        const at = p.from ? parseLocalDate(p.from.trim()) : null;
        return (
          <Card key={pi} style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Txt v="h3" style={{ flex: 1 }}>
                {p.from === null ? t('miles.ratesFromStart') : at !== null ? t('miles.ratesFrom', { date: formatLongDate(at) }) : t('miles.ratesStartDate')}
              </Txt>
              {pi > 0 ? (
                <IconButton icon={Trash2} label={t('miles.ratesRemove')} color="error" onPress={() => setDraft((d) => d.filter((_, i) => i !== pi))} />
              ) : null}
            </View>
            {p.from !== null ? (
              <Field
                label={t('miles.ratesStartDate')}
                value={p.from}
                placeholder="2026-07-01"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                onChangeText={(v) => edit(pi, (x) => ({ ...x, from: v }))}
              />
            ) : null}
            {p.tiers.map((tier, ti) => (
              <Field
                key={ti}
                label={
                  tier.upToMiles !== null
                    ? t('miles.ratesFirst', { miles: formatDistanceNumber(tier.upToMiles, 0) })
                    : ti > 0
                      ? t('miles.ratesAfter')
                      : t('miles.ratesAny')
                }
                value={tier.text}
                keyboardType="decimal-pad"
                style={{ fontFamily: fonts.bold }}
                right={
                  <Txt v="small" c="textSecondary">
                    {unit}
                  </Txt>
                }
                onChangeText={(v) => edit(pi, (x) => ({ ...x, tiers: x.tiers.map((y, j) => (j === ti ? { ...y, text: v } : y)) }))}
              />
            ))}
          </Card>
        );
      })}
      <Button label={t('miles.ratesAdd')} icon={Plus} variant="outline" onPress={addPeriod} />
      {error ? (
        <Txt v="small" c="error" accessibilityLiveRegion="polite" style={{ fontFamily: fonts.semibold }}>
          {error}
        </Txt>
      ) : null}
      <Txt v="caption" c="textTertiary">
        {t('miles.ratesNote')} {t('common.estimateOnly')}
      </Txt>
      <Button label={t('miles.ratesReset')} variant="text" onPress={() => setConfirmReset(true)} />
      <Dialog
        visible={confirmReset}
        title={t('miles.ratesReset')}
        body={t('miles.ratesResetConfirm', { region: region === 'UK' ? t('onboarding.regionUK') : t('onboarding.regionUS') })}
        onClose={() => setConfirmReset(false)}
        actions={[
          { label: t('common.cancel'), onPress: () => setConfirmReset(false) },
          {
            label: t('miles.ratesReset'),
            variant: 'primary',
            onPress: () => {
              setConfirmReset(false);
              setError(null);
              setDraft(toDraft(ratePeriods(DEFAULT_RATES[region])));
            },
          },
        ]}
      />
    </Screen>
  );
}
