import type {StoreConnector} from '@market/core';
import {searchDaralamirat} from './client';
export const daralamirat:StoreConnector={id:'daralamirat',name:'دار الأميرات',enabled:true,preserveSearchTerm:true,search:searchDaralamirat};
