import * as Haptics from 'expo-haptics';
import { useState } from 'react';

import type { Minor } from '@/domain/types';

import { digitIgnored, evaluate, exprMinor, exprOf, pushOp, sanitizeExpr, type CalcOp } from './calc';

/**
 * State of an amount field with the calculator (Q20). The hidden TextInput's text IS the expression: digits come
 * from the system number pad, operators from <CalcBar>; the caret is pinned to the end (`selection`).
 */
export function useAmountExpr(initial: Minor = 0) {
  const [state, setState] = useState(() => ({ expr: exprOf(initial), lastGood: initial }));
  const { expr } = state;
  const result = evaluate(expr);
  const minor = exprMinor(result);

  const commit = (next: string) => {
    const r = evaluate(next);
    // While a sum is invalid the big number keeps (dimmed) the last good value.
    setState((s) => ({ expr: next, lastGood: r.kind === 'value' ? r.minor : r.kind === 'empty' ? 0 : s.lastGood }));
  };

  const onChangeText = (raw: string) => {
    const next = sanitizeExpr(raw);
    // Over the 999,999.99 limit the extra digit is ignored — tell the hand, not the eyes.
    if (digitIgnored(expr, raw, next)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    commit(next);
  };

  return {
    expr,
    result,
    /** Amount Save stores; 0 while empty or invalid. */
    minor,
    shownMinor: result.kind === 'error' ? state.lastGood : minor,
    invalid: result.kind === 'error',
    isExpression: result.kind !== 'empty' && result.expression,
    onChangeText,
    op: (o: CalcOp) => commit(pushOp(expr, o)),
    setMinor: (m: Minor) => commit(exprOf(m)),
    selection: { start: expr.length, end: expr.length },
  };
}

export type AmountExpr = ReturnType<typeof useAmountExpr>;
