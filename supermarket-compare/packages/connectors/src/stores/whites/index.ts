import type {StoreConnector} from '@market/core';
import {searchWhites} from './client';
export const whites:StoreConnector={id:'whites',name:'وايتس',enabled:true,preserveSearchTerm:true,search:searchWhites};
