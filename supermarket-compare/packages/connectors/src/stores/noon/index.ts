import type {StoreConnector} from '@market/core';
import {searchNoon} from './client';
export const noon:StoreConnector={id:'noon',name:'نون ماركت',enabled:true,search:searchNoon};
