import type {StoreConnector} from '@market/core';
import {searchLemon} from './client';
export const lemon:StoreConnector={id:'lemon',name:'ليمون',enabled:true,preserveSearchTerm:true,search:searchLemon};
