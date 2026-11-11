import type { StoreConnector } from '@market/core';
export const othaim: StoreConnector = {
  id: 'othaim', name: 'العثيم', enabled: false,
  async search() { throw new Error('Othaim integration is not implemented'); },
};
