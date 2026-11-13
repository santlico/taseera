import type {Product} from '@market/core';

export function productImageSrc(product:Pick<Product,'store'|'imageUrl'>):string|undefined {
  if(product.store!=='hungerstation') return product.imageUrl;
  try {
    const url=new URL(product.imageUrl!);
    const id=url.pathname.split('/').pop()!;
    if(url.origin!=='https://hungerstation.dhmedia.io' || url.username || url.password ||
      url.pathname!==`/image/product-information-management/${id}` || !/^[a-zA-Z0-9_-]{1,128}\.(png|jpe?g|webp)$/i.test(id)) return;
    return `/api/hungerstation-image?id=${encodeURIComponent(id)}`;
  } catch { return; }
}
