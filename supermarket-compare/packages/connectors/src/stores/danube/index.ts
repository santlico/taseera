import type { StoreConnector } from '@market/core';
import { searchDanube } from './client';
export const danube: StoreConnector = {
  id: 'danube', name: 'الدانوب', enabled: true,
  search: searchDanube,
};
