'use client';
import {useState} from 'react';
export function StoreLogo({src,name}:{src:string;name:string}){
 const [failed,setFailed]=useState(false);
 return failed?<span className="logo-fallback" aria-hidden="true">{name.slice(0,2)}</span>:<img className="store-logo" src={src} alt="" width="32" height="32" onError={()=>setFailed(true)}/>;
}
