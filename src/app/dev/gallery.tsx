import { router } from 'expo-router';
import { Camera, Flag, FileText, Fuel, Minus, Plus, Settings, X } from '@/ui/icons';
import { useState } from 'react';
import { View } from 'react-native';

import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme';
import {
  Avatar,
  Button,
  Card,
  Chip,
  ChipRow,
  Dialog,
  Dot,
  Field,
  Group,
  IconButton,
  ListRow,
  Progress,
  ReceiptThumb,
  RoundButton,
  Screen,
  SectionHeader,
  Segmented,
  SettingRow,
  Sheet,
  Tag,
  Toggle,
  Txt,
  useSnackbar,
} from '@/ui';

/** Dev-only: every UI-kit primitive on one screen, to compare against design/boards/00-main.html. */
export default function Gallery() {
  const { colors } = useTheme();
  const snack = useSnackbar();
  const [seg, setSeg] = useState<'expense' | 'income'>('expense');
  const [tg, setTg] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [dlg, setDlg] = useState(false);
  return (
    <Screen title="UI kit" subtitle="design/sunday.css" headerRight={<IconButton icon={X} label="Close" onPress={() => router.back()} />}>
      <Txt v="label">Type</Txt>
      <Txt v="amountDisplay">£1,053.60</Txt>
      <Txt v="h1">Heading 1</Txt>
      <Txt v="h2">Heading 2</Txt>
      <Txt v="h3">Heading 3</Txt>
      <Txt>Body text 16/24</Txt>
      <Txt v="small" c="textSecondary">Small secondary 14/20</Txt>
      <Txt v="amount" c="incomeText" size={17}>{formatMoney(124000, 'GBP')}</Txt>

      <Txt v="label">Buttons</Txt>
      <Button label="Sort now" />
      <Button label="Start trip" variant="outline" />
      <Button label="Not now" variant="text" />
      <Button label="Delete" variant="danger" />
      <Button label="End trip" variant="dangerOutline" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button label="Expense" icon={Minus} variant="expense" size="big" />
        <Button label="Income" icon={Plus} variant="income" size="big" />
      </View>
      <Button label="Disabled" disabled />
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <IconButton icon={Settings} label="Settings" filled />
        <RoundButton icon={Camera} label="Photo" />
        <RoundButton icon={FileText} label="Note" active />
      </View>

      <Txt v="label">Chips & tags</Txt>
      <ChipRow>
        <Chip label="Fuel" state="best" />
        <Chip label="Van repairs & servicing" />
        <Chip label="All" state="on" size="s" />
        <Chip label="Unsorted" size="s" />
      </ChipRow>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Tag kind="work" label="Work" />
        <Tag kind="personal" label="Personal" />
        <Tag kind="unsorted" label="Unsorted" />
        <Tag kind="neutral" label="GPS" />
      </View>

      <Txt v="label">Cards & rows</Txt>
      <Card>
        <ListRow left={<Avatar kind="unsorted" />} title="EE phone" subtitle="Sat 09:15 · Work" right={<><Dot /><Txt v="amount" c="expenseText" size={17}>−£15.00</Txt></>} />
        <ListRow divider left={<Avatar kind="expense" icon={Fuel} />} title="Shell M62" subtitle="Fuel · Work · 06:12" right={<Txt v="amount" c="expenseText" size={17}>−£72.40</Txt>} />
      </Card>
      <Card variant="sun"><Txt v="h2">14 entries to sort</Txt><Txt v="small" c="sunText">{"Sunday's job — about 3 minutes"}</Txt></Card>
      <Card variant="navy"><Txt v="h3" style={{ color: '#fff' }}>Trip running · 42.3 mi</Txt></Card>
      <Card variant="warn"><Txt v="h3">Your trip stopped recording at 14:05</Txt></Card>
      <Card><ListRow left={<Avatar kind="work" icon={Flag} />} title="Start trip" /></Card>
      <SectionHeader title="Recent" action="See all" />
      <ReceiptThumb />
      <ReceiptThumb large />

      <Txt v="label">Controls</Txt>
      <Segmented
        value={seg}
        onChange={setSeg}
        options={[
          { value: 'expense', label: 'Expense', tone: 'expense' },
          { value: 'income', label: 'Income', tone: 'income' },
        ]}
      />
      <Progress value={9 / 14} />
      <Field label="Purpose" placeholder="e.g. Amazon route DLS4" />
      <Field label="End reading" value="41,100" error="End reading must be higher than start" />
      <Group>
        <SettingRow icon={Settings} title="App lock" subtitle="Fingerprint / Face ID" right={<Toggle value={tg} onChange={setTg} label="App lock" />} />
        <SettingRow title="Region" value="United Kingdom" onPress={() => {}} />
        <SettingRow title="Delete all data" danger onPress={() => {}} />
      </Group>

      <Txt v="label">Overlays</Txt>
      <Button label="Show snackbar" variant="outline" onPress={() => snack({ message: 'Saved · £12.50 expense', actionLabel: 'Undo', onAction: () => {} })} />
      <Button label="Show error snackbar" variant="outline" onPress={() => snack({ message: "Couldn't save the photo.", tone: 'error' })} />
      <Button label="Open sheet" variant="outline" onPress={() => setSheet(true)} />
      <Button label="Open dialog" variant="outline" onPress={() => setDlg(true)} />
      <View style={{ height: 40, backgroundColor: colors.surfaceAlt, borderRadius: 8 }} />

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Export" footer={<Button label="Export" full onPress={() => setSheet(false)} />}>
        <Txt c="textSecondary">Sheet content</Txt>
      </Sheet>
      <Dialog
        visible={dlg}
        onClose={() => setDlg(false)}
        title="Delete this entry?"
        body="This also deletes its receipt photos."
        actions={[
          { label: 'Cancel', onPress: () => setDlg(false) },
          { label: 'Delete', onPress: () => setDlg(false), variant: 'danger' },
        ]}
      />
    </Screen>
  );
}
