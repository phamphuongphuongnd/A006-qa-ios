import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import { t } from '@/i18n';

import { WIDGET_LINKS, type WidgetSnapshot } from '../data';

/** Widget names — must match `react-native-android-widget` `widgets[].name` in app.json. */
export const ANDROID_WIDGETS = { quick: 'SundayQuick', week: 'SundayWeek' } as const;

type Hex = `#${string}`;

interface Skin {
  bg: Hex;
  text: Hex;
  muted: Hex;
  toSort: Hex;
  expBg: Hex;
  expFg: Hex;
  incBg: Hex;
  incFg: Hex;
  tripBg: Hex;
  tripFg: Hex;
  runBg: Hex;
  runFg: Hex;
  runDot: Hex;
}

/** From design/screens/13-system__s-14__android-{light,dark}*.html. */
const LIGHT: Skin = {
  bg: '#FAF8F4',
  text: '#161D2B',
  muted: '#465062',
  toSort: '#6B4A00',
  expBg: '#93371F',
  expFg: '#FFFFFF',
  incBg: '#0F5C39',
  incFg: '#FFFFFF',
  tripBg: '#1F2A44',
  tripFg: '#FFFFFF',
  runBg: '#F5B841',
  runFg: '#1F2A44',
  runDot: '#C2281C',
};
const DARK: Skin = {
  bg: '#1F2632',
  text: '#F3EFE7',
  muted: '#BEC4CE',
  toSort: '#F7CD71',
  expBg: '#F29A84',
  expFg: '#3A1209',
  incBg: '#5FD39A',
  incFg: '#06251A',
  tripBg: '#26324F',
  tripFg: '#FFFFFF',
  runBg: '#F5B841',
  runFg: '#12161C',
  runDot: '#C2281C',
};

const FONT = 'Inter_700Bold';
const FONT_X = 'Inter_800ExtraBold';

function Btn({
  label,
  uri,
  bg,
  fg,
  size,
  radius,
  a11y,
  flex = 1,
  sub,
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
  sub?: string;
  dot?: Hex;
}) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      accessibilityLabel={a11y}
      style={{
        flex,
        height: 'match_parent',
        backgroundColor: bg as ColorProp,
        borderRadius: radius,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
      }}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 4 }}>
        {dot ? <FlexWidget style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot as ColorProp }} /> : null}
        <TextWidget text={label} maxLines={1} truncate="END" style={{ fontSize: size, fontFamily: FONT, color: fg as ColorProp }} />
      </FlexWidget>
      {sub ? <TextWidget text={sub} maxLines={1} style={{ fontSize: size, fontFamily: FONT_X, color: fg as ColorProp }} /> : null}
    </FlexWidget>
  );
}

function SetupWidget({ k }: { k: Skin }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: WIDGET_LINKS.open }}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: k.bg as ColorProp, borderRadius: 24, padding: 12, justifyContent: 'center', alignItems: 'center' }}>
      <TextWidget text={t('widget.setup')} style={{ fontSize: 14, fontFamily: FONT, color: k.muted as ColorProp, textAlign: 'center' }} />
    </FlexWidget>
  );
}

/** 2×1: "−" / "+" and "14 to sort". */
function Quick({ s, k }: { s: WidgetSnapshot; k: Skin }) {
  if (!s.ready) return <SetupWidget k={k} />;
  return (
    <FlexWidget
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: k.bg as ColorProp, borderRadius: 24, padding: 10, flexDirection: 'column', flexGap: 6 }}>
      <FlexWidget style={{ flex: 1, width: 'match_parent', flexDirection: 'row', flexGap: 6 }}>
        <Btn label={t('widget.expenseShort')} uri={WIDGET_LINKS.expense} bg={k.expBg} fg={k.expFg} size={24} radius={16} a11y={t('widget.newExpense')} />
        <Btn label={t('widget.incomeShort')} uri={WIDGET_LINKS.income} bg={k.incBg} fg={k.incFg} size={24} radius={16} a11y={t('widget.newIncome')} />
      </FlexWidget>
      <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'sundaysort://sort' }} style={{ width: 'match_parent', alignItems: 'center' }}>
        <TextWidget text={s.toSortText} maxLines={1} style={{ fontSize: 13, fontFamily: FONT, color: k.toSort as ColorProp, textAlign: 'center' }} />
      </FlexWidget>
    </FlexWidget>
  );
}

/** 4×2: week line + "− Expense" · "+ Income" · "Start trip" / "End trip · 42.3 mi". */
function Week({ s, k }: { s: WidgetSnapshot; k: Skin }) {
  if (!s.ready) return <SetupWidget k={k} />;
  const running = s.trip !== 'none';
  return (
    <FlexWidget
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: k.bg as ColorProp, borderRadius: 28, padding: 16, flexDirection: 'column', flexGap: 10 }}>
      <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: WIDGET_LINKS.open }} style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
        <TextWidget text={s.weekLine} maxLines={1} truncate="END" style={{ fontSize: 13, fontFamily: FONT, color: k.muted as ColorProp }} />
      </FlexWidget>
      <FlexWidget style={{ flex: 1, width: 'match_parent', flexDirection: 'row', flexGap: 8 }}>
        <Btn label={t('widget.expense')} uri={WIDGET_LINKS.expense} bg={k.expBg} fg={k.expFg} size={15} radius={20} a11y={t('widget.newExpense')} />
        <Btn label={t('widget.income')} uri={WIDGET_LINKS.income} bg={k.incBg} fg={k.incFg} size={15} radius={20} a11y={t('widget.newIncome')} />
        {running ? (
          <Btn
            label={t('widget.endTrip')}
            sub={s.tripDistance}
            dot={k.runDot}
            uri={WIDGET_LINKS.endTrip}
            bg={k.runBg}
            fg={k.runFg}
            size={13}
            radius={20}
            flex={1.25}
            a11y={`${t('widget.endTrip')} · ${s.tripDistance}`}
          />
        ) : (
          <Btn label={t('widget.startTrip')} uri={WIDGET_LINKS.startTrip} bg={k.tripBg} fg={k.tripFg} size={15} radius={20} a11y={t('widget.startTrip')} />
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
