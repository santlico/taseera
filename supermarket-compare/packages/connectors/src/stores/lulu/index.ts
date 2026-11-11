import type { StoreConnector } from '@market/core';
export const lulu: StoreConnector = {
  id: 'lulu', name: 'لولو', enabled: false,
  async search() { throw new Error('Lulu integration is not implemented'); },
};
