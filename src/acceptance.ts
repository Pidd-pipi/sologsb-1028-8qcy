import type { AcceptanceConclusion, AcceptanceKind, AcceptanceRecord, PropertySpec } from './types';

/**
 * 验收有效性判断所需的最小组件形状。
 * ComponentSpec 与快照里的 component（Omit<ComponentSpec, 'snapshots'>）都满足该结构。
 */
export interface AcceptanceSubject {
  revision: number;
  keyboardBehavior: string;
  screenReader: string;
  interactionSignature: string;
  properties: PropertySpec[];
  acceptance: AcceptanceRecord[];
}

export const ACCEPTANCE_KINDS: readonly AcceptanceKind[] = ['keyboard', 'screenReader'];

export const acceptanceKindLabel = (kind: AcceptanceKind): string =>
  kind === 'keyboard' ? '键盘' : '读屏';

export const conclusionLabel = (conclusion: AcceptanceConclusion): string =>
  conclusion === 'pass' ? '通过' : '不通过';

/** 属性契约指纹：名称、类型、必填性变化都会影响两侧验收。 */
export const propertyContractFingerprint = (subject: Pick<AcceptanceSubject, 'properties'>): string =>
  subject.properties.map((item) => `${item.name}:${item.type}:${item.required}`).join('|');

/** 内容指纹：键盘侧绑定键盘行为与交互签名，读屏侧只绑定读屏说明。 */
export const contentFingerprint = (
  subject: Pick<AcceptanceSubject, 'keyboardBehavior' | 'screenReader' | 'interactionSignature'>,
  kind: AcceptanceKind
): string =>
  kind === 'keyboard'
    ? `${subject.keyboardBehavior}␟${subject.interactionSignature}`
    : subject.screenReader;

/** 某一项检查最近一次的验收记录（登记即追加，后者为准）。 */
export const latestAcceptance = (
  subject: Pick<AcceptanceSubject, 'acceptance'>,
  kind: AcceptanceKind
): AcceptanceRecord | undefined => {
  const records = subject.acceptance.filter((record) => record.kind === kind);
  return records[records.length - 1];
};

/** 单条记录相对给定契约内容的失效原因；返回空数组表示仍然有效。 */
export function recordInvalidReasons(subject: AcceptanceSubject, record: AcceptanceRecord): string[] {
  const reasons: string[] = [];
  if (record.contentFingerprint !== contentFingerprint(subject, record.kind)) {
    reasons.push(record.kind === 'keyboard' ? '键盘行为或交互签名已变化' : '读屏说明已变化');
  }
  if (record.contractFingerprint !== propertyContractFingerprint(subject)) {
    reasons.push('属性契约已变化');
  }
  return reasons;
}

export interface AcceptanceState {
  record?: AcceptanceRecord;
  /** 记录存在且登记后相关内容未变化 */
  valid: boolean;
  /** 失效原因（有效时为空） */
  reasons: string[];
}

export function acceptanceState(subject: AcceptanceSubject, kind: AcceptanceKind): AcceptanceState {
  const record = latestAcceptance(subject, kind);
  if (!record) return { valid: false, reasons: [] };
  const reasons = recordInvalidReasons(subject, record);
  return { record, valid: reasons.length === 0, reasons };
}

/** 发布前检查：两项验收都必须存在、对当前版本有效且结论为通过。 */
export function publishBlockers(subject: AcceptanceSubject): string[] {
  const blockers: string[] = [];
  for (const kind of ACCEPTANCE_KINDS) {
    const label = acceptanceKindLabel(kind);
    const state = acceptanceState(subject, kind);
    if (!state.record) {
      blockers.push(`${label}验收未登记`);
    } else if (!state.valid) {
      blockers.push(`${label}验收结论已失效`);
    } else if (state.record.conclusion !== 'pass') {
      blockers.push(`${label}验收结论为不通过`);
    }
  }
  return blockers;
}
