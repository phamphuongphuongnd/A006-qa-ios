'use no memo';
// react-native-android-widget renders these as plain functions (no hooks): React Compiler must not touch this file,
// or every render throws "Invalid hook call" and the home-screen widget stays blank.

import { FlexWidget, SvgWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import { t } from '@/i18n';

import { WIDGET_LINKS, type WidgetSnapshot } from '../data';

/** Widget names — must match `react-native-android-widget` `widgets[].name` in app.json. */
export const ANDROID_WIDGETS = { quick: 'SundayQuick', week: 'SundayWeek' } as const;

type Hex = `#${string}`;

interface Skin {
  bg: Hex;
  text: Hex;
  muted: Hex;
  expBg: Hex;
  expFg: Hex;
  incBg: Hex;
  incFg: Hex;
  tripBg: Hex;
  tripFg: Hex;
  runBg: Hex;
  runFg: Hex;
  runDot: Hex;
  /** "14 to sort" pill */
  pendBg: Hex;
  pendFg: Hex;
  pendDot: Hex;
  /** "All sorted" pill */
  okBg: Hex;
  okFg: Hex;
}

/** From design/screens/13-system__s-14__android-{light,dark}*.html. */
const LIGHT: Skin = {
  bg: '#FAF8F4',
  text: '#161D2B',
  muted: '#465062',
  expBg: '#93371F',
  expFg: '#FFFFFF',
  incBg: '#0F5C39',
  incFg: '#FFFFFF',
  tripBg: '#1F2A44',
  tripFg: '#FFFFFF',
  runBg: '#F5B841',
  runFg: '#1F2A44',
  runDot: '#C2281C',
  pendBg: '#FCEFD3',
  pendFg: '#6B4A00',
  pendDot: '#F5B841',
  okBg: '#E3F1E9',
  okFg: '#0F5C39',
};
const DARK: Skin = {
  bg: '#1F2632',
  text: '#F3EFE7',
  muted: '#BEC4CE',
  expBg: '#F29A84',
  expFg: '#3A1209',
  incBg: '#5FD39A',
  incFg: '#06251A',
  tripBg: '#26324F',
  tripFg: '#FFFFFF',
  runBg: '#F5B841',
  runFg: '#12161C',
  runDot: '#C2281C',
  pendBg: '#3A3220',
  pendFg: '#F7CD71',
  pendDot: '#F5B841',
  okBg: '#1E3A2C',
  okFg: '#7EDDB0',
};

/** lucide "flag", stroked in `color`. */
const flagSvg = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>`;

function Btn({
  label,
  uri,
  bg,
  fg,
  size,
  radius,
  a11y,
  flex = 1,
  height,
  icon,
  dot,
}: {
  label: string;
  uri: string;
  bg: Hex;
  fg: Hex;
  size: number;
  radius: number;
  a11y: string;
  flex?: number;
  /** Fixed height in dp; omitted = fill the row. */
  height?: number;
  icon?: string;
  dot?: Hex;
}) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      accessibilityLabel={a11y}
      style={{
        flex,
        height: height ?? 'match_parent',
        backgroundColor: bg as ColorProp,
        borderRadius: radius,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexGap: 6,
        paddingHorizontal: 6,
      }}>
      {dot ? <FlexWidget style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot as ColorProp }} /> : null}
      {icon ? <SvgWidget svg={icon} style={{ width: 16, height: 16 }} /> : null}
      <TextWidget text={label} maxLines={1} truncate="END" style={{ fontSize: size, fontWeight: '700', color: fg as ColorProp }} />
    </FlexWidget>
  );
}

/** "● 14 to sort" (sun) or "✓ All sorted" (green) pill. */
function SortPill({ s, k, size = 12 }: { s: WidgetSnapshot; k: Skin; size?: number }) {
  const pending = s.toSort > 0;
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: pending ? 'sundaysort://sort' : WIDGET_LINKS.open }}
      accessibilityLabel={s.toSortText}
      style={{
        backgroundColor: (pending ? k.pendBg : k.okBg) as ColorProp,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        flexGap: 5,
      }}>
      {pending ? <FlexWidget style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: k.pendDot as ColorProp }} /> : null}
      <TextWidget
        text={pending ? s.toSortText : `✓ ${s.toSortText}`}
        maxLines={1}
        style={{ fontSize: size, fontWeight: '700', color: (pending ? k.pendFg : k.okFg) as ColorProp }}
      />
    </FlexWidget>
  );
}

function SetupWidget({ k }: { k: Skin }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: WIDGET_LINKS.open }}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: k.bg as ColorProp, borderRadius: 24, padding: 12, justifyContent: 'center', alignItems: 'center' }}>
      <TextWidget text={t('widget.setup')} style={{ fontSize: 14, fontWeight: '700', color: k.muted as ColorProp, textAlign: 'center' }} />
    </FlexWidget>
  );
}

/** 2×1: "−" / "+" and the to-sort pill. */
function Quick({ s, k }: { s: WidgetSnapshot; k: Skin }) {
  if (!s.ready) return <SetupWidget k={k} />;
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: k.bg as ColorProp,
        borderRadius: 24,
        padding: 10,
        flexDirection: 'column',
        alignItems: 'center',
        flexGap: 6,
      }}>
      <FlexWidget style={{ flex: 1, width: 'match_parent', flexDirection: 'row', flexGap: 8 }}>
        <Btn label={t('widget.expenseShort')} uri={WIDGET_LINKS.expense} bg={k.expBg} fg={k.expFg} size={26} radius={16} a11y={t('widget.newExpense')} />
        <Btn label={t('widget.incomeShort')} uri={WIDGET_LINKS.income} bg={k.incBg} fg={k.incFg} size={26} radius={16} a11y={t('widget.newIncome')} />
      </FlexWidget>
      <SortPill s={s} k={k} size={11} />
    </FlexWidget>
  );
}

/** 4×2: "THIS WEEK · 9–15 NOV" + pill, big net, in / out / miles, then − Expense · + Income · Start trip (End trip · 4.2 mi). */
function Week({ s, k }: { s: WidgetSnapshot; k: Skin }) {
  if (!s.ready) return <SetupWidget k={k} />;
  const running = s.trip !== 'none';
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: k.bg as ColorProp,
        borderRadius: 28,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
      <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: WIDGET_LINKS.open }} style={{ width: 'match_parent', flexDirection: 'column', flexGap: 2 }}>
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TextWidget
            text={t('widget.thisWeek', { range: s.rangeText.toUpperCase() })}
            maxLines={1}
            style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.08, color: k.muted as ColorProp }}
          />
          <SortPill s={s} k={k} size={11} />
        </FlexWidget>
        <TextWidget text={s.netText} maxLines={1} style={{ fontSize: 30, fontWeight: '800', color: k.text as ColorProp }} />
        <TextWidget text={s.detailText} maxLines={1} truncate="END" style={{ fontSize: 12, fontWeight: '500', color: k.muted as ColorProp }} />
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', flexGap: 8 }}>
        <Btn label={t('widget.expense')} uri={WIDGET_LINKS.expense} bg={k.expBg} fg={k.expFg} size={14} radius={16} height={48} a11y={t('widget.newExpense')} />
        <Btn label={t('widget.income')} uri={WIDGET_LINKS.income} bg={k.incBg} fg={k.incFg} size={14} radius={16} height={48} a11y={t('widget.newIncome')} />
        {running ? (
          <Btn
            label={`${t('widget.endTrip')} · ${s.tripDistance}`}
            dot={k.runDot}
            uri={WIDGET_LINKS.endTrip}
            bg={k.runBg}
            fg={k.runFg}
            size={13}
            radius={16}
            height={48}
            flex={1.3}
            a11y={`${t('widget.endTrip')} · ${s.tripDistance}`}
          />
        ) : (
          <Btn
            label={t('widget.startTrip')}
            icon={flagSvg(k.tripFg)}
            uri={WIDGET_LINKS.startTrip}
            bg={k.tripBg}
            fg={k.tripFg}
            size={14}
            radius={16}
            height={48}
            flex={1.15}
            a11y={t('widget.startTrip')}
          />
        )}
      </FlexWidget>
    </FlexWidget>
  );
}

/** Light + dark variants; the launcher picks by system theme. */
export function renderAndroidWidget(name: string, s: WidgetSnapshot) {
  const W = name === ANDROID_WIDGETS.quick ? Quick : Week;
  return { light: <W s={s} k={LIGHT} />, dark: <W s={s} k={DARK} /> };
}
