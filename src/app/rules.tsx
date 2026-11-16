import { useLocalSearchParams } from 'expo-router';
import { ChevronDown, Plus } from '@/ui/icons';
import { Zap } from '@/features/rules/icons';
import { createElement, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';

import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import type { RuleRow } from '@/db/schema';
import { currencySymbol, parseMinor, toDecimalString } from '@/domain/money';
import { currencyOf, type EntryType, type Scope } from '@/domain/types';
import { CategorySheet } from '@/features/entries/CategorySheet';
import { categoryIcon } from '@/features/entries/icons';
import { openPro } from '@/features/pro/openPro';
import { checkRule, type RuleDraft, type RuleError } from '@/features/rules/match';
import { createRule, deleteRule, findSameRule, getRule, listRules, restoreRule, setRuleEnabled, updateRule, type RuleListItem } from '@/features/rules/repo';
import { NavHeader } from '@/features/settings/ui';
import { t, type TKey } from '@/i18n';
import { usePro } from '@/state/pro';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, useTheme } from '@/theme';
import { Badge, Button, Card, Field, Group, Screen, Segmented, Sheet, Toggle, Txt, useSnackbar } from '@/ui';

const ERR: Record<RuleError | 'duplicate', TKey> = {
  empty_text: 'sortV2.errEmptyText',
  no_category: 'sortV2.errNoCategory',
  bad_range: 'sortV2.errBadRange',
  duplicate: 'sortV2.errDuplicate',
};

/**
 * S-18 Auto-sort rules (F-09, Pro). One switch per rule; tap → edit sheet; "+ Add rule".
 * Free / Pro ended: the list stays visible, switches locked, "Rules are paused" + See Pro (rules and data are kept).
 * Param `id=<ruleId>` (S-05 "Edit rule", S-06d) opens that rule's sheet; `edit=` is the same.
 */
export default function RulesScreen() {
  const params = useLocalSearchParams<{ id?: string; edit?: string }>();
  const { colors } = useTheme();
  const { pro, status } = usePro();
  const snack = useSnackbar();
  const rules = useLive(() => listRules(db), [], ['rules', 'entries', 'categories']);
  const [editing, setEditing] = useState<{ rule: RuleRow | null; n: number } | null>(() => {
    // A deleted rule just shows the list.
    const id = params.id ?? params.edit;
    const r = id ? getRule(db, id) : undefined;
    return r ? { rule: r, n: 0 } : null;
  });

  const open = (rule: RuleRow | null) => {
    if (!pro) return openPro('rules');
    setEditing((e) => ({ rule, n: (e?.n ?? 0) + 1 }));
  };

  const scopeLabel = (s: Scope) => (s === 'work' ? t('common.work') : t('common.personal'));
  const row = (r: RuleListItem, i: number) => (
    <Pressable
      key={r.id}
      accessibilityRole="button"
      accessibilityLabel={`${r.matchText} → ${r.categoryName ?? t('sortV2.noCategory')}`}
      onPress={() => open(r)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        minHeight: 72,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderTopWidth: i > 0 ? 1 : 0,
        borderTopColor: colors.line,
        opacity: pressed ? 0.7 : pro ? 1 : 0.75,
      })}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.sunSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Zap size={20} color={colors.sunText} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 17 }}>
          {`${r.matchText} → ${r.categoryName ?? '—'}`}
        </Txt>
        <Txt v="small" c={r.categoryName ? 'textSecondary' : 'error'} numberOfLines={1}>
          {r.categoryName
            ? r.entryCount === 1
              ? t('sortV2.ruleRowOne', { scope: scopeLabel(r.scope) })
              : t('sortV2.ruleRow', { scope: scopeLabel(r.scope), count: r.entryCount })
            : t('sortV2.noCategory')}
        </Txt>
      </View>
      <Toggle
        value={pro && r.enabled && !!r.categoryId}
        disabled={!pro || !r.categoryId}
        label={t('sortV2.ruleToggle', { name: r.matchText })}
        onChange={(v) => setRuleEnabled(db, r.id, v)}
      />
    </Pressable>
  );

  return (
    <Screen header={<NavHeader title={t('sortV2.rulesTitle')} right={<Badge kind="pro" label="PRO" />} />}>
      {!pro ? (
        <Card variant="sun" style={{ gap: 10 }}>
          <Txt v="h3">{status.kind === 'expired' ? t('sortV2.rulesPaused') : t('sortV2.rulesFree')}</Txt>
          <Txt>{status.kind === 'expired' ? t('sortV2.rulesPausedBody') : t('sortV2.rulesFreeBody')}</Txt>
          <View style={{ alignSelf: 'flex-start' }}>
            <Button label={t('sortV2.seePro')} variant="sun" size="sm" onPress={() => openPro('rules')} />
          </View>
        </Card>
      ) : (
        <Txt c="textSecondary">{t('sortV2.rulesIntro')}</Txt>
      )}
      {rules.length > 0 ? (
        <Group style={{ padding: 0 }}>{rules.map(row)}</Group>
      ) : pro ? (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 32 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.sunSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={40} color={colors.sunText} />
          </View>
          <Txt v="h2" center>
            {t('sortV2.rulesEmpty')}
          </Txt>
          <Txt c="textSecondary" center style={{ maxWidth: 300 }}>
            {t('sortV2.rulesEmptyBody')}
          </Txt>
        </View>
      ) : null}
      {pro ? <Button label={t('sortV2.addRule')} icon={Plus} variant="outline" full onPress={() => open(null)} /> : null}

      <RuleSheet
        key={editing?.n ?? -1}
        visible={!!editing}
        rule={editing?.rule ?? null}
        onClose={() => setEditing(null)}
        onSaved={(name, category) => snack({ above: 'none', message: t('sortV2.ruleSaved', { name, category }) })}
        onDeleted={(row) =>
          snack({ above: 'none', message: t('sortV2.ruleDeleted'), actionLabel: t('common.undo'), onAction: () => restoreRule(db, row) })
        }
      />
    </Screen>
  );
}

function RuleSheet({
  visible,
  rule,
  onClose,
  onSaved,
  onDeleted,
}: {
  visible: boolean;
  rule: RuleRow | null;
  onClose: () => void;
  onSaved: (name: string, category: string) => void;
  onDeleted: (row: RuleRow) => void;
}) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const currency = currencyOf(settings.region ?? 'UK');
  const cats = useLive(() => listCategories(db, { includeHidden: true }), [], ['categories']);
  const [text, setText] = useState(rule?.matchText ?? '');
  const [type, setType] = useState<EntryType>(rule?.type ?? 'expense');
  const [min, setMin] = useState(rule?.minMinor != null ? toDecimalString(rule.minMinor) : '');
  const [max, setMax] = useState(rule?.maxMinor != null ? toDecimalString(rule.maxMinor) : '');
  const [categoryId, setCategoryId] = useState<string | null>(rule?.categoryId ?? null);
  const [scope, setScope] = useState<Scope>(rule?.scope ?? 'work');
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<RuleError | 'duplicate' | null>(null);
  const cat = categoryId ? cats.find((c) => c.id === categoryId) : undefined;

  const amount = (s: string) => {
    const v = parseMinor(s);
    return v !== null && v > 0 ? v : null;
  };
  const save = () => {
    const d: RuleDraft = { matchText: text, type, minMinor: amount(min), maxMinor: amount(max), categoryId, scope };
    const err = checkRule(d) ?? (findSameRule(db, text, type, rule?.id) ? 'duplicate' : null);
    if (err) {
      setError(err);
      return;
    }
    if (rule) updateRule(db, rule.id, d);
    else createRule(db, d);
    onClose();
    onSaved(text.trim(), cat?.name ?? '');
  };

  const box = { backgroundColor: colors.surfaceAlt, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, gap: 2 };
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={rule ? t('sortV2.editRuleTitle') : t('sortV2.newRule')}
      footer={
        <View style={{ gap: 4, paddingTop: 12 }}>
          <Button label={t('sortV2.saveRule')} full onPress={save} />
          {rule ? (
            <Button
              label={t('sortV2.deleteRule')}
              variant="text"
              full
              onPress={() => {
                const row = deleteRule(db, rule.id);
                onClose();
                if (row) onDeleted(row);
              }}
            />
          ) : null}
        </View>
      }>
      <Field
        label={t('sortV2.whenSays')}
        value={text}
        onChangeText={(v) => {
          setText(v);
          setError(null);
        }}
        placeholder={t('sortV2.whenSaysHint')}
        maxLength={60}
        autoCapitalize="words"
        error={error === 'empty_text' || error === 'duplicate' ? t(ERR[error], { name: text.trim() }) : null}
      />
      <Txt v="label" c="textSecondary">
        {t('sortV2.entryType')}
      </Txt>
      <Segmented<EntryType>
        value={type}
        onChange={(v) => {
          setType(v);
          if (cat && cat.type !== v) setCategoryId(null);
        }}
        options={[
          { value: 'expense', label: t('common.expense') },
          { value: 'income', label: t('common.income') },
        ]}
      />
      <Txt v="label" c="textSecondary">
        {t('sortV2.amountBetween')}
      </Txt>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field
            label={t('sortV2.from')}
            value={min}
            onChangeText={(v) => {
              setMin(v.replace(/[^\d.]/g, ''));
              setError(null);
            }}
            keyboardType="decimal-pad"
            placeholder={`${currencySymbol(currency)}0.00`}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label={t('sortV2.to')}
            value={max}
            onChangeText={(v) => {
              setMax(v.replace(/[^\d.]/g, ''));
              setError(null);
            }}
            keyboardType="decimal-pad"
            placeholder={`${currencySymbol(currency)}0.00`}
            error={error === 'bad_range' ? t(ERR.bad_range) : null}
          />
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('sortV2.sortAs')}, ${cat?.name ?? t('sortV2.pickCategory')}`}
        onPress={() => {
          // Otherwise Android gives focus back to the text field when the picker closes and the keyboard hides Save.
          Keyboard.dismiss();
          setPicking(true);
        }}
        style={[box, { flexDirection: 'row', alignItems: 'center', minHeight: 64 }, error === 'no_category' && { borderWidth: 2, borderColor: colors.error }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="caption" c="textSecondary">
            {t('sortV2.sortAs')}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {cat ? createElement(categoryIcon(cat.icon), { size: 20, color: colors.text }) : null}
            <Txt style={{ fontSize: 17 }} c={cat ? 'text' : 'placeholder'}>
              {cat?.name ?? t('sortV2.pickCategory')}
            </Txt>
          </View>
        </View>
        <ChevronDown size={20} color={colors.text} />
      </Pressable>
      {error === 'no_category' ? (
        <Txt v="small" c="error">
          {t(ERR.no_category)}
        </Txt>
      ) : null}
      <Segmented<Scope>
        value={scope}
        onChange={setScope}
        options={[
          { value: 'work', label: t('common.work') },
          { value: 'personal', label: t('common.personal') },
        ]}
      />
      <CategorySheet
        visible={picking}
        onClose={() => setPicking(false)}
        type={type}
        selectedId={categoryId}
        onPick={(id) => {
          setPicking(false);
          if (id) {
            setCategoryId(id);
            setError(null);
          }
        }}
      />
    </Sheet>
  );
}
