import type { StoreConnector } from '@market/core';
import { searchTamimi } from './client';
export const tamimi: StoreConnector = {
  id: 'tamimi', name: 'التميمي', enabled: true,
  search: searchTamimi,
};
