import type { StoreConnector } from '@market/core';
import { searchAmazon } from './client';
export const amazon: StoreConnector = {id: 'amazon', name: 'أمازون', enabled: true, search: searchAmazon};
