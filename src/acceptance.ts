import type { AcceptanceRecord, AcceptanceTrack, ComponentSpec } from './types';

export type AcceptanceSource = Pick<
  ComponentSpec,
  'revision' | 'acceptance' | 'keyboardBehavior' | 'screenReader' | 'properties' | 'states' | 'interactionSignature'
>;

export const ACCEPTANCE_TRACKS: AcceptanceTrack[] = ['keyboard', 'screenReader'];

export const trackLabel = (track: AcceptanceTrack): string => (track === 'keyboard' ? '键盘' : '读屏');

const propertyInputs = (component: AcceptanceSource): string =>
  component.properties.map((item) => `${item.name}:${item.type}:${item.required}:${item.defaultValue}`).join('|');

/**
 * 每个方向只覆盖与自己相关的契约输入：键盘方向看键盘行为、交互签名、
 * 状态与属性；读屏方向看读屏说明、状态与属性。这样键盘行为变化只会让
 * 键盘验收失效，读屏验收不受影响，反之亦然；属性等共享契约变化则两边
 * 一起失效。
 */
export function acceptanceFingerprint(component: AcceptanceSource, track: AcceptanceTrack): string {
  const shared = [propertyInputs(component), component.states.trim()].join('::');
  const own =
    track === 'keyboard'
      ? [component.keyboardBehavior.trim(), component.interactionSignature.trim()].join('::')
      : component.screenReader.trim();
  return `${track}::${shared}::${own}`;
}

export type AcceptanceValidity = 'valid' | 'stale-contract' | 'stale-revision' | 'missing';

export interface AcceptanceStatus {
  track: AcceptanceTrack;
  record?: AcceptanceRecord;
  validity: AcceptanceValidity;
  detail: string;
}

export function latestAcceptance(component: AcceptanceSource, track: AcceptanceTrack): AcceptanceRecord | undefined {
  const records = component.acceptance ?? [];
  return records.filter((record) => record.track === track).at(-1);
}

export function acceptanceStatus(component: AcceptanceSource, track: AcceptanceTrack): AcceptanceStatus {
  const record = latestAcceptance(component, track);
  if (!record) return { track, validity: 'missing', detail: '尚未登记验收结论。' };
  if (record.revision !== component.revision) {
    return {
      track,
      record,
      validity: 'stale-revision',
      detail: `结论绑定 r${record.revision}，当前契约为 r${component.revision}，需要重新验收。`
    };
  }
  if (record.fingerprint !== acceptanceFingerprint(component, track)) {
    return {
      track,
      record,
      validity: 'stale-contract',
      detail:
        track === 'keyboard'
          ? '登记后键盘行为、交互签名或相关属性已变化，结论不再适用。'
          : '登记后读屏说明或相关属性已变化，结论不再适用。'
    };
  }
  return { track, record, validity: 'valid', detail: `结论对当前版本 r${component.revision} 有效。` };
}

export function publishBlockers(component: AcceptanceSource): string[] {
  const blockers: string[] = [];
  for (const track of ACCEPTANCE_TRACKS) {
    const status = acceptanceStatus(component, track);
    if (status.validity === 'missing') blockers.push(`${trackLabel(track)}验收未登记`);
    else if (status.validity !== 'valid') blockers.push(`${trackLabel(track)}验收记录已失效`);
    else if (status.record?.conclusion !== 'pass') blockers.push(`${trackLabel(track)}验收结论为不通过`);
  }
  return blockers;
}

export function describeAcceptance(status: AcceptanceStatus, withBasis = false): string {
  const { record, validity } = status;
  if (!record) return '未验收';
  const conclusion = record.conclusion === 'pass' ? '通过' : '不通过';
  const state =
    validity === 'valid' ? '有效' : validity === 'stale-revision' ? '已失效（版本已更新）' : '已失效（契约变更）';
  const basis = withBasis ? ` · 依据：${record.basis || '（未填写）'}` : '';
  return `${state} · ${conclusion} · ${record.inspector} · r${record.revision}${basis}`;
}
