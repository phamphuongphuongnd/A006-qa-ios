import { Pressable, StyleSheet, View } from 'react-native';

import { formatMoney, MAX_MINOR } from '@/domain/money';
import type { ProStatus } from '@/domain/pro';
import type { Currency } from '@/domain/types';
import { dayMonth } from '@/features/entries/format';
import { useNow } from '@/features/entries/useNow';
import { openPro } from '@/features/pro/openPro';
import { t } from '@/i18n';
import { fonts, useTheme } from '@/theme';
import { Button, ReceiptThumb, Sheet, Txt } from '@/ui';
import { Camera, Lock, Receipt, X, Zap } from '@/ui/icons';

import { CALC_OPS, formatExpr, type CalcOp } from './calc';
import { allowanceResetsOn, FREE_PHOTOS_PER_MONTH } from './fill';
import type { AmountExpr } from './useAmountExpr';

const OP_LABEL: Record<CalcOp, { glyph: string; a11y: Parameters<typeof t>[0] }> = {
  '+': { glyph: '+', a11y: 'ocr.opPlus' },
  '-': { glyph: '−', a11y: 'ocr.opMinus' },
  '*': { glyph: '×', a11y: 'ocr.opTimes' },
  '/': { glyph: '÷', a11y: 'ocr.opDivide' },
};

/** "Max £999,999.99" while the last digit typed was dropped by the limit (QA-100 19/11: it vanished silently). */
export function AmountLimitHint({ amount, currency }: { amount: AmountExpr; currency: Currency }) {
  if (!amount.atLimit) return null;
  return (
    <Txt v="caption" c="sunText" accessibilityLiveRegion="polite" style={{ fontFamily: fonts.semibold, textAlign: 'center' }}>
      {t('ocr.maxAmount', { amount: formatMoney(MAX_MINOR, currency) })}
    </Txt>
  );
}

/** "+ − × ÷" row that sits right above the system number pad (AmountKeypad, Q20). */
export function CalcBar({ onOp }: { onOp: (op: CalcOp) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.calcTray, { backgroundColor: colors.surfaceAlt }]}>
      {CALC_OPS.map((op) => (
        <Pressable
          key={op}
          accessibilityRole="button"
          accessibilityLabel={t(OP_LABEL[op].a11y)}
          onPress={() => onOp(op)}
          style={({ pressed }) => [
            styles.calcKey,
            { backgroundColor: pressed ? colors.line : colors.surface, borderColor: colors.line },
          ]}>
          <Txt style={{ fontSize: 24, lineHeight: 28, fontFamily: fonts.semibold }} c="work" maxFontSizeMultiplier={1.3}>
            {OP_LABEL[op].glyph}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

/** Small expression line above the big amount ("12.50+4.20"), or "Check the sum" when it is invalid. */
export function ExprLine({ amount }: { amount: AmountExpr }) {
  if (!amount.isExpression) return null;
  return (
    <View style={{ alignItems: 'center' }}>
      <Txt v="small" c="textSecondary" numberOfLines={1} style={{ fontSize: 18, lineHeight: 24 }} maxFontSizeMultiplier={1.4}>
        {formatExpr(amount.expr)}
      </Txt>
      {amount.invalid ? (
        <Txt v="caption" c="error" maxFontSizeMultiplier={1.6}>
          {t('ocr.checkSum')}
        </Txt>
      ) : null}
    </View>
  );
}

/** Pale yellow "From receipt" tag under a field the reading filled (P1-12). */
export function FromReceiptTag() {
  const { colors } = useTheme();
  return (
    <View style={styles.tag} accessibilityLabel={t('ocr.fromReceipt')}>
      <Receipt size={18} color={colors.sunText} />
      <Txt v="caption" c="sunText" style={{ fontFamily: fonts.bold, fontSize: 15 }} maxFontSizeMultiplier={1.6}>
        {t('ocr.fromReceipt')}
      </Txt>
    </View>
  );
}

/** "Receipt says £72.40 · Use". */
export function ReceiptSaysChip({ minor, currency, onUse }: { minor: number; currency: Currency; onUse: () => void }) {
  const { colors } = useTheme();
  const amount = formatMoney(minor, currency);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('ocr.useA11y', { amount })}
      onPress={onUse}
      hitSlop={6}
      style={[styles.chip, { backgroundColor: colors.sunSoft, borderColor: colors.sun }]}>
      <Receipt size={18} color={colors.text} />
      <Txt style={{ fontSize: 15, fontFamily: fonts.semibold }} maxFontSizeMultiplier={1.6} numberOfLines={1}>
        {t('ocr.receiptSays', { amount })} · <Txt style={{ fontSize: 15, fontFamily: fonts.extrabold }}>{t('ocr.use')}</Txt>
      </Txt>
    </Pressable>
  );
}

/** "Reading receipt…" (≤ 2 s, never blocks typing). */
export function ReadingChip() {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={t('ocr.reading')}
      style={[styles.chip, { backgroundColor: colors.sunSoft, borderColor: colors.sun, minHeight: 36 }]}>
      <Zap size={16} color={colors.text} />
      <Txt style={{ fontSize: 14, fontFamily: fonts.semibold }} maxFontSizeMultiplier={1.4} numberOfLines={1}>
        {t('ocr.reading')}
      </Txt>
    </View>
  );
}

/** Thumbnails of the photos waiting in Quick capture, each with ✕ (Q21). */
export function PendingThumbs({ uris, onRemove }: { uris: string[]; onRemove: (index: number) => void }) {
  const { colors } = useTheme();
  return (
    <>
      {uris.map((uri, i) => (
        <View key={uri}>
          <ReceiptThumb uri={uri} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('capture.removePhoto')}
            onPress={() => onRemove(i)}
            hitSlop={10}
            style={[styles.remove, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
            <X size={14} color={colors.onPrimary} strokeWidth={3} />
          </Pressable>
        </View>
      ))}
    </>
  );
}

/** "Photo" round button: "+ Photo" once one is taken, "3 of 3" when full, a small lock when the free photos ran out. */
export function PhotoButton({
  count,
  max,
  locked,
  onPress,
  onLongPress,
}: {
  count: number;
  max: number;
  locked: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { colors } = useTheme();
  const full = count >= max;
  const filled = count > 0 && !full && !locked;
  const label = full ? t('ocr.photoCount', { count, max }) : count > 0 ? t('ocr.addMorePhoto') : t('capture.photo');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={locked ? t('ocr.photoLocked') : label}
      accessibilityHint={full || locked ? undefined : t('capture.photoHint')}
      accessibilityState={{ disabled: full }}
      disabled={full}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.rbl}>
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.rb,
              {
                backgroundColor: filled ? colors.primary : colors.surface,
                borderColor: filled ? colors.primary : full ? colors.line : colors.lineStrong,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <Camera size={24} color={filled ? colors.onPrimary : full ? colors.textTertiary : colors.text} strokeWidth={2} />
            {locked ? (
              <View style={[styles.lock, { backgroundColor: colors.surfaceAlt, borderColor: colors.surface }]}>
                <Lock size={13} color={colors.text} strokeWidth={2.5} />
              </View>
            ) : null}
          </View>
          <Txt maxFontSizeMultiplier={1.4} numberOfLines={2} center style={{ maxWidth: 96, fontSize: 13, fontFamily: fonts.semibold }} c={full ? 'textTertiary' : 'textSecondary'}>
            {label}
          </Txt>
        </>
      )}
    </Pressable>
  );
}

/** "14 of 20 free photos left this month" — orange at 3 or fewer (free only). */
export function PhotosLeft({ left, low }: { left: number; low: boolean }) {
  return (
    <Txt v="caption" c={low ? 'warnText' : 'textSecondary'} center maxFontSizeMultiplier={1.6} style={{ fontFamily: low ? fonts.bold : fonts.regular }}>
      {left === 1 ? t('ocr.photosLeftOne', { limit: FREE_PHOTOS_PER_MONTH }) : t('ocr.photosLeft', { left, limit: FREE_PHOTOS_PER_MONTH })}
    </Txt>
  );
}

/**
 * Free photos used up (S-03 sheet, never a blocking popup). `onSkip` = "Save without photo" on Quick capture
 * (the entry still saves); S-05 passes none and shows "Not now".
 */
export function PhotosUsedUpSheet({
  visible,
  onClose,
  onSkip,
  trialAvailable,
}: {
  visible: boolean;
  onClose: () => void;
  onSkip?: () => void;
  trialAvailable: boolean;
}) {
  const { colors } = useTheme();
  const date = dayMonth(allowanceResetsOn(useNow(60 * 60_000)));
  return (
    <Sheet visible={visible} onClose={onClose} scroll={false}>
      <View style={{ gap: 14 }}>
        <View style={[styles.sheetIcon, { backgroundColor: colors.sunSoft }]}>
          <Camera size={22} color={colors.sunText} />
        </View>
        <Txt v="h2" accessibilityRole="header">
          {t('ocr.usedUpTitle', { limit: FREE_PHOTOS_PER_MONTH })}
        </Txt>
        <Txt c="textSecondary">{t(onSkip ? 'ocr.usedUpBody' : 'ocr.usedUpBodyDetail', { date })}</Txt>
        <Button
          label={trialAvailable ? t('ocr.tryPro') : t('ocr.goPro')}
          variant="sun"
          full
          onPress={() => {
            onClose();
            openPro('photos');
          }}
        />
        <Button label={onSkip ? t('ocr.saveWithoutPhoto') : t('ocr.notNow')} variant="text" full onPress={onSkip ?? onClose} />
      </View>
    </Sheet>
  );
}

/** Trial still on offer? (sheet button wording) */
export const trialOffered = (status: ProStatus) => (status.kind === 'free' || status.kind === 'expired') && status.trialAvailable;

const styles = StyleSheet.create({
  calcTray: { flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingVertical: 6 },
  calcKey: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderRadius: 22, borderWidth: 2, paddingHorizontal: 16, alignSelf: 'center' },
  remove: { position: 'absolute', top: -10, right: -10, width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rbl: { alignItems: 'center', gap: 6, minWidth: 64 },
  rb: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  lock: { position: 'absolute', right: -6, bottom: -6, width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  sheetIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

/**
 * QA-100 MOD-5 / B-86: the photo library only opened on a long press nobody found. Tapping Photo now asks where the
 * receipt comes from (a long press still goes straight to the library).
 */
export function PhotoSourceSheet({
  visible,
  onPick,
  onClose,
}: {
  visible: boolean;
  onPick: (source: 'camera' | 'library') => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={t('capture.photoSourceTitle')} scroll={false}>
      <View style={{ gap: 10 }}>
        <Button label={t('capture.takePhoto')} full onPress={() => onPick('camera')} />
        <Button label={t('capture.chooseLibrary')} variant="outline" full onPress={() => onPick('library')} />
      </View>
    </Sheet>
  );
}
