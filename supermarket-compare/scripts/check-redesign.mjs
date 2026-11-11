import {Browser,sleep} from 'file:///C:/Users/hp/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await Browser.launch();
await mkdir('.taste-skill/redesign-results',{recursive:true});
try{
 const page=await browser.newPage({width:1440,height:1000});
 await page.goto('http://127.0.0.1:3002');
 assert.equal(await page.eval(()=>document.querySelectorAll('.unavailable input:disabled').length),3);
 assert.equal(await page.eval(()=>document.querySelectorAll('.picker input:checked').length),5);
 await page.eval(()=>document.querySelector('.suggestions button').click());
 await page.eval(()=>document.querySelector('form').requestSubmit());
 for(let i=0;i<30;i++){if(await page.eval(()=>!!document.querySelector('.results')))break;await sleep(500)}
 const evidence=await page.eval(()=>({panels:document.querySelectorAll('.store-panel').length,products:document.querySelectorAll('.product-row').length,chartRows:document.querySelectorAll('.bar-row').length,logos:[...document.querySelectorAll('.sidebar img')].map(i=>({src:i.getAttribute('src'),ok:i.complete&&i.naturalWidth>0})),errors:document.querySelector('[role=alert]')?.textContent}));
 assert.equal(evidence.panels,5);assert.equal(evidence.chartRows,5);assert.ok(evidence.products>0);assert.ok(evidence.logos.every(l=>l.ok));
 await page.eval(()=>document.querySelector('.price-chart').open=true);
 assert.equal(await page.eval(()=>document.querySelectorAll('.price-bar-row').length),5);
 await page.screenshot({path:'.taste-skill/redesign-results/desktop.jpg',fullPage:true});
 await page.eval(()=>document.querySelectorAll('.tabs button')[1].click());
 assert.equal(await page.eval(()=>document.querySelectorAll('.store-panel').length),1);
 await page.eval(()=>document.querySelector('.filters input').click());
 await page.setViewport({width:390,height:844,mobile:true});
 await page.screenshot({path:'.taste-skill/redesign-results/mobile.jpg',fullPage:true});
 assert.equal(await page.eval(()=>document.documentElement.scrollWidth>window.innerWidth),false);
 await page.setViewport({width:768,height:1024});
 await page.screenshot({path:'.taste-skill/redesign-results/tablet.jpg',fullPage:true});
 console.log(JSON.stringify(evidence,null,2));
 await writeFile('.taste-skill/redesign-results/interaction.json',JSON.stringify(evidence,null,2));
}finally{await browser.close()}
