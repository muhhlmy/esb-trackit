// Loopback-only UI fixture. No production authentication or API mutations.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
const root=resolve('frontend/dist');
const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://localhost').pathname;if(path.startsWith('/api/')){res.writeHead(500);return res.end('Unmocked API');}try{const file=path.startsWith('/assets/')?resolve(root,'.'+path):resolve(root,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
let count=0;
try{
for(const width of (process.env.WIDTHS || '360,390,768,1024,1440,1920').split(',').map(Number)) for(const mode of ['full','read_only','none']) for(const scenario of ['populated','empty','error','long']) for(const module of ['it','ga','ops']) {
 const user={id:1,nama:'Fixture',role:'admin',permissions:{dashboard:'full',assets:mode,assets_ga:mode,assets_ops:mode}};
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
 await context.addInitScript(user=>localStorage.setItem('user',JSON.stringify(user)),user);
 const rows=Array.from({length:3},(_,i)=>({id:i+1,id_aset:i+1,hostname:'FIXTURE-'+i,nama_asset:scenario==='long'?'Perangkat kantor dengan nama dan lokasi sangat panjang '.repeat(5):'Perangkat Fixture '+i,tipe_perangkat:'Laptop',tipe_fasilitas:'Meja',kategori:'Peralatan',brand_merek:'Lenovo',serial_number:'SN-FIXTURE-'+i,lokasi:'Jakarta',lokasi_asset:'Jakarta',lokasi_detail:'Ruang kantor',quantity:1,kondisi:'Baik',status:'In Use',pic:'Petugas Fixture',total_asset_amount:100000}));
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();if(!url.pathname.startsWith('/api/'))return route.continue();assert.equal(route.request().method(),'GET','No mutation allowed');if(url.pathname==='/api/auth/me')return route.fulfill({json:user});if(['/api/assets','/api/ga-assets','/api/ops-assets'].includes(url.pathname))return route.fulfill(scenario==='error'?{status:500,json:{message:'Fixture unavailable'}}:{json:scenario==='empty'?[]:rows});return route.fulfill({json:[]});});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+(module==='it'?'/assets':'/assets-'+module));
 if(mode==='none'){await expect(page.locator('.inventory-polish')).toHaveCount(0);await context.close();count++;continue;}
 const view=page.locator('.inventory-polish');await view.waitFor();await page.locator('[data-testid="page-ready"]').waitFor();
 await expect(view.locator('.inventory-primary-action')).toHaveCount(mode==='full'?1:0);
 for(const layout of ['table','card']){
 await page.evaluate(({module,layout})=>localStorage.setItem('trackit_view_mode_assets-'+module,layout),{module,layout});await page.reload();await page.locator('.inventory-polish[data-testid="page-ready"]').waitFor();
 const geometry=await view.evaluate(el=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...el.querySelectorAll('.inventory-actions button')].map(b=>{const r=b.getBoundingClientRect();return {height:r.height,width:r.width};})}));
 assert.equal(geometry.overflow,false,JSON.stringify({width,mode,scenario,module,layout,geometry}));for(const b of geometry.buttons)assert.ok(b.height>=44&&b.width>=44,JSON.stringify(b));
 }
 if(scenario==='populated'){
 for(const action of ['Lihat Detail','Cetak Label',...(mode==='full'?['Edit Aset']:[])]) {
 await view.getByRole('button',{name:/Aksi aset/}).filter({visible:true}).first().click();
 if(mode==='read_only') await expect(page.getByRole('menuitem',{name:'Edit Aset',exact:true})).toHaveCount(0);
 await page.getByRole('menuitem',{name:action,exact:true}).click();
 const dialog=page.locator('.inventory-dialog');await expect(dialog).toBeVisible();
 assert.equal(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth),false,action);
 await dialog.getByRole('button',{name:'Tutup dialog',exact:true}).click();await expect(dialog).toHaveCount(0);
 }

 for(const name of ['Filter','Export',...(mode==='full'?['Import',module==='it'?'Tambah Aset':`Tambah Aset ${module.toUpperCase()}`]:[])]){
 await view.getByRole('button',{name,exact:true}).click();const dialog=page.locator('.inventory-dialog');await expect(dialog).toBeVisible();
 const bounds=await dialog.evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,overflow:el.scrollWidth>el.clientWidth,buttons:[...el.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().height).map(b=>b.getBoundingClientRect().height)};});assert.ok(bounds.left>=0&&bounds.right<=width);assert.equal(bounds.overflow,false);for(const h of bounds.buttons)assert.ok(h>=44,`${name}: ${h}`);
 await dialog.getByRole('button',{name:'Tutup dialog',exact:true}).click();await expect(dialog).toHaveCount(0);
 }
 }
 assert.deepEqual(errors,[]);await context.close();count++;console.log(JSON.stringify({width,mode,scenario,module,pass:true}));
}
console.log(`PASS ${count} asset cases, both layout preferences; GET-only mocks, external requests blocked`);
}finally{await browser.close();server.close();}
