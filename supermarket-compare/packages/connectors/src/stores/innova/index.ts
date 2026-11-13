import type {StoreConnector} from '@market/core';
import {searchInnova} from './client';
export const innova:StoreConnector={id:'innova',name:'إنوفا',enabled:true,preserveSearchTerm:true,search:searchInnova};
