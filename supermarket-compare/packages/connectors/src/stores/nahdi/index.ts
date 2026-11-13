import type {StoreConnector} from '@market/core';
import {searchNahdi} from './client';
export const nahdi:StoreConnector={id:'nahdi',name:'النهدي',enabled:true,preserveSearchTerm:true,search:searchNahdi};
