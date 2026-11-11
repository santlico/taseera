import type { StoreConnector } from '@market/core';
import { searchNinja } from './client';
export const ninja:StoreConnector={id:'ninja',name:'نينجا',enabled:true,search:searchNinja};
