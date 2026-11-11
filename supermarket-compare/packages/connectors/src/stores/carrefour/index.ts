import type { StoreConnector } from '@market/core';
import { searchCarrefour } from './client';
export const carrefour: StoreConnector = {id:'carrefour',name:'كارفور',enabled:true,search:searchCarrefour};
