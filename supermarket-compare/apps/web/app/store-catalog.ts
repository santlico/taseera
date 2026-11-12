import type {StoreId} from '@market/core';
export const stores: {id:StoreId;name:string;english:string;enabled:boolean;scope:string;logo:string}[]=[
 {id:'danube',name:'الدانوب',english:'Danube',enabled:true,scope:'الريان، الرياض · الروابي',logo:'/stores/danube.png'},
 {id:'carrefour',name:'كارفور',english:'Carrefour',enabled:true,scope:'Granada - Riyadh · افتراضي',logo:'/stores/carrefour.png'},
 {id:'tamimi',name:'التميمي',english:'Tamimi Markets',enabled:true,scope:'سعر الموقع الافتراضي',logo:'/stores/tamimi.png'},
 {id:'ninja',name:'نينجا',english:'Ninja',enabled:true,scope:'سعر الموقع الافتراضي',logo:'/stores/ninja.png'},
 {id:'bindawood',name:'بن داود',english:'BinDawood',enabled:true,scope:'المرسلات، الرياض · بانوراما',logo:'/stores/bindawood.png'},
 {id:'amazon',name:'أمازون',english:'Amazon.sa',enabled:true,scope:'السعودية · البائع والتوصيل حسب المنتج',logo:'/stores/amazon.ico'},
 {id:'lulu',name:'لولو',english:'LuLu',enabled:false,scope:'قيد الربط',logo:'/stores/lulu.png'},
 {id:'othaim',name:'العثيم',english:'Othaim',enabled:false,scope:'قيد الربط',logo:'/stores/othaim.png'},
 {id:'sadhan',name:'السدحان',english:'Al Sadhan',enabled:false,scope:'قيد الربط',logo:'/stores/sadhan.png'},
];
export const storeInfo=(id:StoreId)=>stores.find(s=>s.id===id)!;
