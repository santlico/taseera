import type {StoreConnector} from '@market/core';
import {searchKnooz} from './client';
export const knooz:StoreConnector={id:'knooz',name:'كنوز العناية',enabled:true,preserveSearchTerm:true,search:searchKnooz};
