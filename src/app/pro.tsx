import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { startTrial } from '@/db/proRepo';
import { TRIAL_DAYS, type ProFeature } from '@/domain/pro';
import { useProRenewalSignal } from '@/features/pro/homeAlerts';
import { openManageSubscription } from '@/features/pro/manage';
import { rememberProPrice, syncProNotices } from '@/features/pro/notices';
import { perWeekText, priceText, shortDate, type PurchaseProblem } from '@/features/pro/purchase';
import { buyPro, loadProProduct, refreshProFromStore, restorePro } from '@/features/pro/store';
import { ABOUT_LINKS } from '@/features/settings/about';
import { NavHeader } from '@/features/settings/ui';
import { useNow } from '@/features/entries/useNow';
import { t } from '@/i18n';
import { usePro } from '@/state/pro';
import { useSettings } from '@/state/settings';
import { fonts, GUTTER, useTheme, type ColorName } from '@/theme';
import { Badge, Button, Card, Progress, Txt, useSnackbar } from '@/ui';
import { Car, CheckCircle2, FileText, ImagePlus, Info, Pause, Receipt, RotateCcw, Sun, Tags, type LucideIcon } from '@/ui/icons';

const FEATURES: ProFeature[] = ['auto_trips', 'rules', 'recurring', 'ocr', 'suggestions', 'tax_files', 'photos', 'route_miles'];
const BENEFIT_ICONS: LucideIcon[] = [Car, Tags, Receipt, RotateCcw, ImagePlus, FileText];
/** Apple's standard licence agreement covers subscriptions without a custom EULA; Play's terms on Android. */
const TERMS_URL = Platform.OS === 'ios' ? 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/' : 'https://play.google.com/about/play-terms/';
const fullDate = (at: number) => `${shortDate(at)} ${new Date(at).getFullYear()}`;

/**
 * S-19 Sunday Sort Pro (F-18): free → benefits, price, "Try Pro free for 7 days" (once), Subscribe, Restore;
 * trial → days left + Subscribe now; Pro → renews / Manage subscription; ended → Renew. `?feature=` (from openPro)
 * sets the subtitle ("Tax-year files are a Pro feature"). Never blocks: back returns to what the driver was doing.
 */
export default function ProScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const snack = useSnackbar();
  const { settings } = useSettings();
  const region = settings.region ?? 'UK';
  const { status } = usePro();
  const now = useNow(60_000);
  const renewal = useProRenewalSignal(now);
  const params = useLocalSearchParams<{ feature?: string }>();
  const feature = FEATURES.includes(params.feature as ProFeature) ? (params.feature as ProFeature) : null;
  const [storePrice, setStorePrice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    loadProProduct().then((p) => {
      if (!live || !p) return;
      setStorePrice(p.price);
      rememberProPrice(p.price);
    });
    void refreshProFromStore();
    return () => {
      live = false;
    };
  }, []);

  const price = priceText(storePrice, region);
  const week = perWeekText(price);
  const ios = Platform.OS === 'ios';

  const say = (p: PurchaseProblem) => {
    if (p === 'cancelled') return;
    if (p === 'failed') {
      setFailed(true);
      return;
    }
    const msg: Record<Exclude<PurchaseProblem, 'cancelled' | 'failed'>, string> = {
      offline: ios ? t('pro.screen.offlineIOS') : t('pro.screen.offlineAndroid'),
      unavailable: t('pro.screen.unavailable'),
      pending: t('pro.screen.pending'),
      owned: t('pro.screen.owned'),
    };
    snack({ message: msg[p], tone: p === 'offline' || p === 'unavailable' ? 'error' : 'default' });
  };

  const subscribe = async () => {
    setFailed(false);
    setBusy('buy');
    try {
      const r = await buyPro();
      if (r.ok) snack({ message: t('pro.screen.subscribed') });
      else say(r.problem);
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setFailed(false);
    setBusy('restore');
    try {
      const r = await restorePro();
      if (!r.ok) say(r.problem);
      else snack({ message: r.found ? t('pro.screen.restored') : t('pro.screen.noPurchase') });
    } finally {
      setBusy(null);
    }
  };

  const tryFree = () => {
    if (startTrial(db)) {
      snack({ message: t('pro.trialStarted') });
      void syncProNotices(db);
    } else snack({ message: t('pro.trialUsed') });
  };

  const benefits = t('pro.screen.benefits').split('|');
  const benefitList = (n = benefits.length) => (
    <View style={{ gap: 10 }}>
      {benefits.slice(0, n).map((b, i) => (
        <Benefit key={b} icon={BENEFIT_ICONS[i]} label={b} />
      ))}
    </View>
  );

  const footer = (
    <View style={{ gap: 12, marginTop: 4 }}>
      <Txt v="small" c="textSecondary" center>
        {ios ? t('pro.screen.promiseIOS') : t('pro.screen.promiseAndroid')}
      </Txt>
      <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 4 }}>
        {status.kind !== 'pro' ? <Link label={t('pro.screen.restore')} onPress={restore} disabled={busy !== null} /> : null}
        <Link label={t('pro.screen.terms')} onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} />
        {ABOUT_LINKS.privacyUrl ? <Link label={t('pro.screen.privacy')} onPress={() => WebBrowser.openBrowserAsync(ABOUT_LINKS.privacyUrl!)} /> : null}
      </View>
    </View>
  );

  const failedCard = failed ? (
    <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <Circle tone="sunSoft">
        <Info size={22} color={colors.sunText} />
      </Circle>
      <View style={{ flex: 1 }}>
        <Txt v="h3" accessibilityLiveRegion="polite">
          {t('pro.screen.failed')}
        </Txt>
        <Txt c="textSecondary">{t('pro.screen.failedBody')}</Txt>
      </View>
    </Card>
  ) : null;

  let body;
  if (status.kind === 'pro') {
    body = (
      <>
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Circle tone="incomeSoft">
              <CheckCircle2 size={24} color={colors.ok} />
            </Circle>
            <View style={{ flex: 1 }}>
              <Txt v="h3">{t('pro.screen.proOn')} ✓</Txt>
              {status.renewsAt ? (
                <Txt c="textSecondary">
                  {status.autoRenewing
                    ? t('pro.screen.renews', { date: fullDate(status.renewsAt), price })
                    : t('pro.screen.endsOn', { date: fullDate(status.renewsAt) })}
                </Txt>
              ) : null}
            </View>
          </View>
          <Button label={t('pro.screen.manage')} variant="outline" onPress={openManageSubscription} style={{ alignSelf: 'flex-start' }} />
          <Link label={t('pro.screen.restore')} onPress={restore} disabled={busy !== null} align="start" />
        </Card>
        {renewal.due && renewal.renewsAt ? (
          <Card variant="sun" style={{ gap: 2 }}>
            <Txt v="h3">{t('pro.screen.renewNoticeTitle', { date: shortDate(renewal.renewsAt), price })}</Txt>
            <Txt>{ios ? t('pro.screen.renewNoticeIOS') : t('pro.screen.renewNoticeAndroid')}</Txt>
          </Card>
        ) : null}
        <Txt v="overline" c="textSecondary">
          {t('pro.screen.whatYouGet')}
        </Txt>
        {benefitList()}
      </>
    );
  } else if (status.kind === 'trial') {
    const left = status.daysLeft;
    body = (
      <>
        <View style={{ borderRadius: 20, borderWidth: 2, borderColor: colors.sun, backgroundColor: colors.surface, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Badge kind="trial" label={left === 1 ? t('pro.screen.trialBadgeOne') : t('pro.screen.trialBadge', { days: left })} />
            <Sun size={26} color={colors.sun} />
          </View>
          <Progress value={(TRIAL_DAYS - left) / TRIAL_DAYS} />
          <Txt>{t('pro.screen.trialEnds', { date: shortDate(status.endsAt) })}</Txt>
          <Button label={t('pro.screen.subscribeNow')} variant="sun" full loading={busy === 'buy'} disabled={busy !== null} onPress={subscribe} />
        </View>
        {failedCard}
        <Txt v="overline" c="textSecondary">
          {t('pro.screen.whatYouGet')}
        </Txt>
        {benefitList()}
        <Card style={{ gap: 4, backgroundColor: colors.surfaceAlt }}>
          <Txt v="h3">{t('pro.screen.trialEndsTitle')}</Txt>
          <Txt c="textSecondary">{t('pro.screen.trialEndsBody')}</Txt>
        </Card>
      </>
    );
  } else {
    const trialAvailable = status.trialAvailable;
    body = (
      <>
        {status.kind === 'expired' ? (
          <Card style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Circle tone="surfaceAlt">
                <Pause size={22} color={colors.textSecondary} />
              </Circle>
              <View style={{ flex: 1 }}>
                <Txt v="h3">{t('pro.screen.endedTitle', { date: shortDate(status.endedAt) })}</Txt>
                <Txt c="textSecondary">{t('pro.ended')}</Txt>
              </View>
            </View>
            {!trialAvailable ? (
              <Button label={t('pro.screen.renew', { price })} full loading={busy === 'buy'} disabled={busy !== null} onPress={subscribe} />
            ) : null}
          </Card>
        ) : null}
        <View style={{ gap: 8 }}>
          <Badge kind="pro" label={t('pro.badge')} />
          <Txt v="h1" accessibilityRole="header">
            {t('pro.screen.title')}
          </Txt>
          {feature ? <Txt c="textSecondary">{t(`pro.context.${feature}`)}</Txt> : null}
        </View>
        {benefitList()}
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Txt v="amount" size={44} style={{ lineHeight: 52 }}>
              {price}
            </Txt>
            <Txt v="h3" c="textSecondary">
              {t('pro.screen.perYear')}
            </Txt>
          </View>
          <Txt c="textSecondary">{week ? t('pro.screen.perWeek', { week }) : t('pro.screen.perWeekNoPrice')}</Txt>
        </View>
        {trialAvailable ? (
          <View style={{ gap: 6 }}>
            <Button label={t('pro.tryFree')} variant="sun" size="big" full disabled={busy !== null} onPress={tryFree} />
            <Txt v="small" c="textSecondary" center>
              {t('pro.tryFreeNote')}
            </Txt>
          </View>
        ) : null}
        {trialAvailable || status.kind === 'free' ? (
          <Button
            label={t('pro.screen.subscribe', { price })}
            variant={trialAvailable ? 'outline' : 'primary'}
            size="big"
            full
            loading={busy === 'buy'}
            disabled={busy !== null}
            onPress={subscribe}
          />
        ) : null}
        {failedCard}
        <Card style={{ gap: 4, backgroundColor: colors.surfaceAlt }}>
          <Txt v="h3">{t('pro.screen.freeTitle')}</Txt>
          <Txt v="small" c="textSecondary">
            {t('pro.screen.freeItems')}
          </Txt>
        </Card>
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <NavHeader title={t('pro.screen.title')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: insets.bottom + 24, gap: 16 }}>
        {body}
        {footer}
      </ScrollView>
    </View>
  );
}

function Circle({ tone, children }: { tone: ColorName; children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors[tone], alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
}

function Benefit({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.sunSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={colors.sunText} strokeWidth={2} />
      </View>
      <Txt style={{ flex: 1 }}>{label}</Txt>
    </View>
  );
}

function Link({ label, onPress, disabled, align = 'center' }: { label: string; onPress: () => void; disabled?: boolean; align?: 'center' | 'start' }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, alignSelf: align === 'start' ? 'flex-start' : 'auto', opacity: pressed || disabled ? 0.6 : 1 })}>
      <Txt style={{ color: colors.primaryText, fontFamily: fonts.bold }}>{label}</Txt>
    </Pressable>
  );
}
