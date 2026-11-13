import type {StoreConnector} from '@market/core';
import {searchUnited} from './client';
export const united:StoreConnector={id:'united',name:'المتحدة',enabled:true,preserveSearchTerm:true,search:searchUnited};
