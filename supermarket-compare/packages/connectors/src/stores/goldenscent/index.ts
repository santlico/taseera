import type {StoreConnector} from '@market/core';
import {searchGoldenscent} from './client';
export const goldenscent:StoreConnector={id:'goldenscent',name:'قولدن سنت',enabled:true,preserveSearchTerm:true,search:searchGoldenscent};
