import { ACCEPTANCE_KINDS, acceptanceKindLabel, acceptanceState, conclusionLabel, type AcceptanceSubject } from './acceptance';
import type { ComponentSnapshot, ComponentSpec, DiffRow } from './types';

const selectedFields: Array<Exclude<keyof ComponentSpec, 'snapshots'>> = [
  'name', 'category', 'status', 'purpose', 'usage', 'states', 'keyboardBehavior', 'screenReader', 'disabledScenarios'
];

const format = (value: unknown): string => {
  if (Array.isArray(value)) return value.map((item) => JSON.stringify(item)).join('\n');
  return String(value ?? '');
};

export function diffAgainstSnapshot(component: ComponentSpec, snapshot?: ComponentSnapshot): DiffRow[] {
  if (!snapshot) return [];
  const rows: DiffRow[] = [];
  for (const field of selectedFields) {
    const before = format(snapshot.component[field]);
    const after = format(component[field]);
    if (before !== after) rows.push({ field: String(field), before, after });
  }
  const beforeProperties = format(snapshot.component.properties);
  const afterProperties = format(component.properties);
  if (beforeProperties !== afterProperties) rows.push({ field: 'properties', before: beforeProperties, after: afterProperties });
  const beforeExamples = format(snapshot.component.examples);
  const afterExamples = format(component.examples);
  if (beforeExamples !== afterExamples) rows.push({ field: 'examples', before: beforeExamples, after: afterExamples });
  return rows;
}

const describeAcceptance = (subject: AcceptanceSubject, kind: (typeof ACCEPTANCE_KINDS)[number], tense: 'then' | 'now'): string => {
  const state = acceptanceState(subject, kind);
  if (!state.record) return '未登记';
  const record = state.record;
  const base = `r${record.revision} · ${record.inspector} · ${conclusionLabel(record.conclusion)}`;
  if (tense === 'then') return `${base}（当时${state.valid ? '有效' : '已失效'}）`;
  return state.valid ? `${base} · 仍然有效` : `${base} · 已失效（${state.reasons.join('；')}）`;
};

/**
 * 验收结论对比：固定输出键盘、读屏两行，
 * 能看出哪些结论在快照后失效、哪些仍然有效。
 */
export function diffAcceptance(component: ComponentSpec, snapshot?: ComponentSnapshot): DiffRow[] {
  if (!snapshot) return [];
  return ACCEPTANCE_KINDS.map((kind) => ({
    field: `${acceptanceKindLabel(kind)}验收`,
    before: describeAcceptance(snapshot.component, kind, 'then'),
    after: describeAcceptance(component, kind, 'now')
  }));
}
