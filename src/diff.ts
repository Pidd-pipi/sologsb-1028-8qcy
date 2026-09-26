import { ACCEPTANCE_TRACKS, acceptanceStatus, describeAcceptance, trackLabel } from './acceptance';
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

/**
 * 验收结论对照：快照留档时的状态（含登记依据）与当前状态逐方向列出，
 * 无论是否变化都保留一行，以便看出哪些结论失效、哪些仍然有效。
 */
export function acceptanceDiffRows(component: ComponentSpec, snapshot?: ComponentSnapshot): DiffRow[] {
  if (!snapshot) return [];
  return ACCEPTANCE_TRACKS.map((track) => ({
    field: `${trackLabel(track)}验收`,
    before: describeAcceptance(acceptanceStatus(snapshot.component, track), true),
    after: describeAcceptance(acceptanceStatus(component, track))
  }));
}
