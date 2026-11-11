import type { StoreConnector } from '@market/core';
import { searchBindawood } from './client';
export const bindawood: StoreConnector = {id:'bindawood',name:'بن داود',enabled:true,search:searchBindawood};
