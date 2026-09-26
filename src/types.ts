export type ComponentStatus = 'draft' | 'review' | 'published';
export type PreviewTheme = 'light' | 'dark';
export type PreviewDensity = 'compact' | 'regular' | 'spacious';

export type AcceptanceKind = 'keyboard' | 'screenReader';
export type AcceptanceConclusion = 'pass' | 'fail';

export interface AcceptanceRecord {
  id: string;
  kind: AcceptanceKind;
  /** 检查人 */
  inspector: string;
  /** 验收依据（标准、走查记录等） */
  basis: string;
  /** 验收结论 */
  conclusion: AcceptanceConclusion;
  checkedAt: string;
  /** 登记时绑定的契约版本 */
  revision: number;
  /** 登记时相关内容指纹：键盘侧为键盘行为+交互签名，读屏侧为读屏说明 */
  contentFingerprint: string;
  /** 登记时属性契约指纹 */
  contractFingerprint: string;
}

export interface PropertySpec {
  id: string;
  name: string;
  type: string;
  required: boolean;
  defaultValue: string;
  description: string;
}

export interface ComponentExample {
  id: string;
  title: string;
  code: string;
  propertyIds: string[];
  stale: boolean;
  staleReason: string;
  createdFromRevision: number;
}

export interface ComponentSpec {
  id: string;
  name: string;
  category: string;
  status: ComponentStatus;
  purpose: string;
  usage: string;
  properties: PropertySpec[];
  states: string;
  keyboardBehavior: string;
  screenReader: string;
  disabledScenarios: string;
  interactionSignature: string;
  examples: ComponentExample[];
  acceptance: AcceptanceRecord[];
  revision: number;
  updatedAt: string;
  snapshots: ComponentSnapshot[];
}

export interface ComponentSnapshot {
  revision: number;
  savedAt: string;
  reason: string;
  component: Omit<ComponentSpec, 'snapshots'>;
}

export interface WorkspaceState {
  components: ComponentSpec[];
  selectedId: string;
}

export interface ValidationIssue {
  id: string;
  level: 'error' | 'warning' | 'info';
  componentId: string;
  target: string;
  message: string;
  field: 'properties' | 'examples' | 'keyboard' | 'screenReader';
}

export interface DiffRow {
  field: string;
  before: string;
  after: string;
}
