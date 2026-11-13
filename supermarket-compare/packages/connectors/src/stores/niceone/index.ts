import type {StoreConnector} from '@market/core';
import {searchNiceone} from './client';
export const niceone:StoreConnector={id:'niceone',name:'نايس ون',enabled:true,preserveSearchTerm:true,search:searchNiceone};
