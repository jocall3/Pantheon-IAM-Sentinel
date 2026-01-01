
export type SimulationStatus = 'idle' | 'running' | 'completed' | 'error' | 'analyzing' | 'remediating';
export type NodeStatus = 'neutral' | 'pending' | 'success' | 'fail' | 'partial' | 'inferred';

export interface ResourceNode {
  id: string;
  name: string;
  type: 'project' | 'bucket' | 'instance' | 'function' | 'database' | 'network' | 'serviceAccount' | 'unknown' | 'organization' | 'folder';
  status: NodeStatus;
  results?: { permission: string; granted: boolean; conditionEvaluated?: boolean; conditionSatisfied?: boolean }[];
  policyBindings?: IamPolicyBinding[];
  tags?: string[];
  metadata?: Record<string, any>;
  parentResourceId?: string;
}

export interface IamPolicyBinding {
  role: string;
  members: string[];
  condition?: PolicyCondition;
  id?: string;
  source?: 'manual' | 'discovered' | 'recommended' | 'ai-generated';
  effectiveOn?: string;
  expiresOn?: string;
}

export interface PolicyCondition {
  expression: string;
  title?: string;
  description?: string;
  evaluatedResult?: boolean;
}

export interface SimulationPrincipal {
  id: string;
  type: 'user' | 'serviceAccount' | 'group' | 'externalIdentity';
  attributes?: Record<string, any>;
}

export interface SimulationConfig {
  principal: SimulationPrincipal;
  permissions: string[];
  resources: string[];
}

export interface RemediationProposal {
  id: string;
  description: string;
  changes: PolicyChange[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  status: 'pending' | 'applied' | 'rejected';
  reasoning?: string;
  generatedBy?: 'Gemini' | 'ChatGPT' | 'AutoOptimizer';
}

export interface PolicyChange {
  action: 'add' | 'remove' | 'update';
  resourceId: string;
  binding: IamPolicyBinding;
  oldBinding?: IamPolicyBinding;
}

export interface AuditLogEntry {
  timestamp: string;
  principalId: string;
  resourceId: string;
  methodName: string;
  granted: boolean;
  reason: string;
  metadata: Record<string, any>;
}
