import type {StoreConnector} from '@market/core';
import {searchAldawaa} from './client';
export const aldawaa:StoreConnector={id:'aldawaa',name:'الدواء',enabled:true,preserveSearchTerm:true,search:searchAldawaa};
