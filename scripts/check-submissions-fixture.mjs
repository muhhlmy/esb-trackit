// Isolated browser fixture: no production auth, API, or database access.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
const root = resolve('frontend/dist')
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  if(path.startsWith('/api/')) {res.writeHead(500);res.end('Unmocked API');return}
  try {
    const file = path.startsWith('/assets/') ? resolve(root, '.' + path) : resolve(root, 'index.html')
    const body = await readFile(file)
    res.setHeader('Content-Type', {'.js':'text/javascript','.css':'text/css','.html':'text/html'}[extname(file)] || 'application/octet-stream')
    res.end(body)
  } catch { res.writeHead(404);res.end() }
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({headless:true})
try {
 for (const readOnly of [false,true]) {
  const context = await browser.newContext({viewport:{width:1440,height:1000}})
  const user = {id:1,nama:'Fixture',role:'admin',permissions:{submissions:readOnly?'read_only':'full'}}
  const payload = {pemberiNik:'EMP1',pemberiNama:'Pemberi Fixture',pemberiDirektorat:'IT',penerimaNik:'',isPenerimaLainnya:true,penerimaNama:'Penerima Fixture',penerimaDirektorat:'Ops',tanggal:'2026-09-22',tujuan:'baru',asetBaruList:[{id_aset:1,tipe:'Laptop',qty:1,spesifikasi:'Fixture Laptop'}],asetLamaList:[]}
  let rows = [{id:7,submission_number:'BAST-FIXTURE',status:'draft',payload}], writes = []
  await context.addInitScript(user=>localStorage.setItem('user',JSON.stringify(user)),user)
  await context.route('**/*',async route=>{
   const u = new URL(route.request().url())
   if (u.origin !== origin) return route.abort()
   if (!u.pathname.startsWith('/api/')) return route.continue()
   let data = []
   if(u.pathname==='/api/auth/me') data=user
   else if(u.pathname.startsWith('/api/submissions')) {
    const method=route.request().method()
    if(method==='POST'||method==='PUT') {
      assert.equal(readOnly,false)
      const body=route.request().postDataJSON();writes.push(method)
      const saved={id:method==='POST'?8:7,submission_number:method==='POST'?'BAST-NEW':'BAST-FIXTURE',...body}
      rows=[saved,...rows.filter(r=>r.id!==saved.id)];data=saved
    } else data=/\/\d+$/.test(u.pathname)?rows.find(r=>String(r.id)===u.pathname.split('/').pop()):{data:rows,total:rows.length,totalPages:1}
   } else if(u.pathname==='/api/karyawan') data=[{nik:'EMP1',nama_karyawan:'Pemberi Fixture',departemen:'IT'},{nik:'EMP2',nama_karyawan:'Receiver Fixture',departemen:'Ops'}]
   else if(u.pathname==='/api/assets') data=[{id:1,hostname:'Fixture Laptop',nik_pemegang_asset:'OTHER'},{id:2,hostname:'Free Laptop'},{id:3,hostname:'Giver Laptop',nik_pemegang_asset:'EMP1'},{id:4,hostname:'Receiver Laptop',nik_pemegang_asset:'EMP2'},{id:5,hostname:'Name Only',nama_karyawan_pemegang_asset:'Unknown'}]
   return route.fulfill({json:data??{},status:200})
  })
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto(origin+'/submissions')
  await page.getByRole('link',{name:'BAST-FIXTURE',exact:true}).waitFor()
  assert.equal(await page.getByRole('columnheader',{name:'Status',exact:true}).count(),0)
  const gap=await page.locator('.submission-history').evaluate(e=>getComputedStyle(e).gap)
  assert.equal(gap,'16px')
  await page.getByRole('row').filter({hasText:'BAST-FIXTURE'}).click()
  await page.waitForURL('**/submissions/7')
  await page.getByLabel('Tanggal Formulir Serah Terima').waitFor()
  await page.waitForFunction(()=>document.querySelector('[aria-label="Tanggal Formulir Serah Terima"]').value==='2026-09-22')
  assert.equal(await page.locator('fieldset').evaluate(e=>e.disabled),readOnly)
  if(readOnly) assert.equal(await page.getByRole('button',{name:'Simpan',exact:true}).count(),0)
  await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.waitForURL('**/submissions')
  await page.getByTitle('Tampilan Kartu').click()
  await page.locator('.submission-laptop-row').click();await page.waitForURL('**/submissions/7')
  await page.getByLabel('Tanggal Formulir Serah Terima').waitFor()
  await page.reload();await page.getByLabel('Tanggal Formulir Serah Terima').waitFor()
  if(!readOnly) {
   await page.getByLabel('Tanggal Formulir Serah Terima').fill('2026-09-23')
   await page.getByRole('button',{name:'Simpan',exact:true}).click();await page.waitForURL('**/submissions')
   assert.equal(rows[0].payload.tanggal,'2026-09-23');assert.deepEqual(writes,['PUT'])
   assert.deepEqual(rows[0].payload.asetBaruList,payload.asetBaruList)
   await page.getByRole('link',{name:'BAST-FIXTURE',exact:true}).click()
   await page.getByLabel('Tanggal Formulir Serah Terima').waitFor()
  }
  const popupPromise=page.waitForEvent('popup')
  await page.getByRole('button',{name:'Cetak',exact:true}).click()
  const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded')
  assert.match(await popup.locator('body').innerText(),/Pemberi Fixture/)
  assert.match(await popup.locator('body').innerText(),/Fixture Laptop/)
  await popup.close()
  assert.equal(writes.length,readOnly?0:2)
  await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.waitForURL('**/submissions')
  const count=writes.length
  await page.getByRole('button',{name:'Aksi BAST BAST-FIXTURE',exact:true}).click()
  const historyPopup=page.waitForEvent('popup')
  await page.getByText('Cetak BAST',{exact:true}).click();const printed=await historyPopup
  await printed.waitForLoadState('domcontentloaded');await printed.close()
  assert.equal(writes.length,count);assert.equal(new URL(page.url()).pathname,'/submissions')
  if (!readOnly) {
   await page.goto(origin+'/submissions/new')
   await page.locator('.submission-fields').waitFor()
   const units=page.locator('.submission-unit')
   const newSelect=units.nth(0).locator('button[aria-haspopup="listbox"]')
   const oldSelect=units.nth(1).locator('button[aria-haspopup="listbox"]')
   await newSelect.click()
   assert.deepEqual(await page.getByRole('option').allTextContents(),['Free Laptop'])
   await page.keyboard.press('Escape')
   await oldSelect.click()
   assert.equal(await page.getByRole('option').count(),0)
   await page.keyboard.press('Escape')
   const partySelects=page.locator('.submission-fields').locator('button[aria-haspopup="listbox"]')
   await partySelects.nth(0).click();await page.getByRole('option').filter({hasText:'Pemberi Fixture'}).click()
   await partySelects.nth(1).click();await page.getByRole('option').filter({hasText:'Receiver Fixture'}).click()
   await oldSelect.click()
   assert.deepEqual((await page.getByRole('option').allTextContents()).map(s=>s.trim()),['Giver Laptop','Receiver Laptop'])
   await page.getByRole('option').filter({hasText:'Receiver Laptop'}).click()
   await page.locator('input[type=checkbox]').first().check()
   await page.getByRole('button',{name:'Simpan',exact:true}).click()
   assert.equal(writes.length,count)
   assert.match(await page.locator('.submission-form').innerText(),/pilih ulang atau kosongkan/i)
   await units.nth(1).getByRole('button',{name:'Kosongkan aset'}).click()
   console.log(JSON.stringify({assetFilters:true,noPartiesEmpty:true,nikUnion:true,customRecipientStaleBlocked:true,historicAssetAssignedElsewherePreserved:true}))
   for (const width of [1440, 390]) {
    await page.setViewportSize({width,height:1000})
    const spacing = await page.locator('.submission-form').evaluate(form => {
     const css = e => {const s=getComputedStyle(e);return {gap:s.gap,padding:s.padding,height:s.height,display:s.display}}
     return {width:innerWidth,form:css(form),section:css(form.querySelector('.submission-section')),label:css(form.querySelector('label')),input:css(form.querySelector('input:not([type=checkbox])')),unit:css(form.querySelector('.submission-unit')),footer:css(form.lastElementChild),overflow:document.documentElement.scrollWidth>innerWidth}
    })
    assert.equal(spacing.label.display,'flex')
    assert.equal(spacing.label.gap,'8px')
    assert.equal(spacing.section.gap,'20px')
    assert.equal(spacing.section.padding,width===1440?'24px':'16px')
    assert.equal(spacing.unit.gap,'16px')
    assert.equal(spacing.unit.padding,'16px')
    assert.equal(spacing.footer.gap,'20px')
    assert.equal(spacing.footer.padding,width===1440?'20px':'16px')
    assert.equal(spacing.overflow,false)
    const labelGaps=await page.locator('.submission-form label:not(:has(input[type=checkbox],input[type=radio]))').evaluateAll(labels=>labels.filter(e=>e.children.length>1).map(e=>e.children[1].getBoundingClientRect().top-e.children[0].getBoundingClientRect().bottom))
    assert.ok(labelGaps.length>0)
    assert.ok(labelGaps.every(gap=>gap>=7.9),JSON.stringify(labelGaps))
    console.log(JSON.stringify({newFormSpacing:spacing,labelGaps}))
   }
   await page.getByRole('button',{name:'Cancel',exact:true}).click()
   await page.waitForURL('**/submissions')
   assert.equal(writes.length,count)
  }
  await page.setViewportSize({width:390,height:844})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({fixture:true,readOnly,rowCardCancelReload:true,savePrint:true,historyNoWrite:true,gap,mobileNoOverflow:true,writes}))
  await context.close()
 }
} finally {await browser.close();server.close()}
