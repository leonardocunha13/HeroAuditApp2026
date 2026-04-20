// amplify/storage/resource.ts

import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'HeroAuditAppDrive',
  access: (allow) => ({
    'public/uploads/*': [
      allow.groups(['admin']).to(['read', 'write']),
      allow.groups(['user']).to(['read', 'write']),
      allow.guest.to(['read']),
    ],
    'public/signatures/*': [
      allow.groups(['admin']).to(['read', 'write']),
      allow.groups(['user']).to(['read', 'write']),
      allow.guest.to(['read']),
    ],
  }),
});