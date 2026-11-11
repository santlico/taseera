import type { StoreConnector } from '@market/core';
export const sadhan: StoreConnector = {
  id: 'sadhan', name: 'السدحان', enabled: false,
  async search() { throw new Error('Sadhan integration is not implemented'); },
};
