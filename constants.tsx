
import { ResourceNode, IamPolicyBinding } from './types';

export const COMMON_PERMISSIONS = [
  'storage.objects.get',
  'storage.objects.list',
  'storage.objects.create',
  'compute.instances.get',
  'compute.instances.start',
  'compute.instances.stop',
  'resourcemanager.projects.get',
  'iam.serviceAccounts.actAs'
];

export const INITIAL_RESOURCES: ResourceNode[] = [
  {
    id: 'org/pantheon-enterprise',
    name: 'Pantheon Enterprise',
    type: 'organization',
    status: 'neutral',
    policyBindings: [
      { role: 'roles/owner', members: ['user:admin@pantheon.ai'] }
    ]
  },
  {
    id: 'org/pantheon-enterprise/folder/production',
    name: 'Production Environment',
    type: 'folder',
    parentResourceId: 'org/pantheon-enterprise',
    status: 'neutral'
  },
  {
    id: 'projects/pantheon-core-prod',
    name: 'Pantheon Core Prod',
    type: 'project',
    parentResourceId: 'org/pantheon-enterprise/folder/production',
    status: 'neutral',
    policyBindings: [
      { role: 'roles/viewer', members: ['group:all-staff@pantheon.ai'] }
    ]
  },
  {
    id: 'projects/pantheon-core-prod/b/customer-data',
    name: 'customer-data-bucket',
    type: 'bucket',
    parentResourceId: 'projects/pantheon-core-prod',
    status: 'neutral',
    tags: ['PII', 'Production'],
    policyBindings: [
      { 
        role: 'roles/storage.objectAdmin', 
        members: ['serviceAccount:data-worker@pantheon-core-prod.iam.gserviceaccount.com'] 
      }
    ]
  },
  {
    id: 'projects/pantheon-core-prod/instances/main-api-server',
    name: 'main-api-server',
    type: 'instance',
    parentResourceId: 'projects/pantheon-core-prod',
    status: 'neutral'
  }
];

export const INITIAL_PRINCIPAL = {
  id: 'user:developer@pantheon.ai',
  type: 'user' as const
};
