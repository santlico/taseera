import type {Product} from '@market/core';

export function productImageSrc(product:Pick<Product,'store'|'imageUrl'>):string|undefined {
  if(product.store==='goldenscent'){
    try{const url=new URL(product.imageUrl!);const path=url.pathname.slice('/catalog/product/'.length);
      if(url.origin!=='https://assets.goldenscent.com'||url.username||url.password||!url.pathname.startsWith('/catalog/product/')||!/^[a-zA-Z0-9_-]{1,4}\/[a-zA-Z0-9_-]{1,4}\/[a-zA-Z0-9_().-]{1,300}\.(png|jpe?g|webp)$/i.test(path))return;
      return `/api/goldenscent-image?path=${encodeURIComponent(path)}`;
    }catch{return;}
  }
  if(product.store!=='hungerstation') return product.imageUrl;
  try {
    const url=new URL(product.imageUrl!);
    const id=url.pathname.split('/').pop()!;
    if(url.origin!=='https://hungerstation.dhmedia.io' || url.username || url.password ||
      url.pathname!==`/image/product-information-management/${id}` || !/^[a-zA-Z0-9_-]{1,128}\.(png|jpe?g|webp)$/i.test(id)) return;
    return `/api/hungerstation-image?id=${encodeURIComponent(id)}`;
  } catch { return; }
}
