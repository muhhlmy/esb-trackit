// ============================================================
// scripts/generate-user-manual-pdf.mjs
// Generator PDF Buku Panduan Resmi TrackIT via Playwright
// ============================================================
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

async function generatePdf() {
  const htmlPath = path.join(rootDir, 'docs', 'user-manual-source.html')
  const pdfPath = path.join(rootDir, 'docs', 'PANDUAN_PENGGUNAAN_TRACKIT.pdf')

  if (!fs.existsSync(htmlPath)) {
    throw new Error(`File sumber HTML tidak ditemukan pada: ${htmlPath}`)
  }

  console.log(`[PDF Generator] Membaca sumber HTML: ${htmlPath}`)
  const htmlContent = fs.readFileSync(htmlPath, 'utf8')

  console.log('[PDF Generator] Meluncurkan browser Chromium headless...')
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  console.log('[PDF Generator] Memuat konten dan merender tata letak dokumen...')
  await page.setContent(htmlContent, { waitUntil: 'networkidle' })

  // Tunggu web fonts jika ada
  await page.evaluate(async () => {
    if (document.fonts) {
      await document.fonts.ready
    }
  })

  console.log(`[PDF Generator] Mencetak dokumen ke format PDF: ${pdfPath}`)
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size: 7.5pt; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #94a3b8; width: 100%; padding: 0 12mm; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; box-sizing: border-box;">
        <span style="font-weight: 600; color: #0a51b0;">TrackIT — Buku Panduan & User Manual</span>
        <span>PT Esensi Solusi Buana</span>
      </div>
    `,
    footerTemplate: `
      <div style="font-size: 7.5pt; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #94a3b8; width: 100%; padding: 0 12mm; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 3px; box-sizing: border-box;">
        <span>Klasifikasi: Dokumen Internal Resmi</span>
        <span>Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></span>
      </div>
    `,
    margin: {
      top: '18mm',
      bottom: '18mm',
      left: '12mm',
      right: '12mm',
    },
  })

  await browser.close()

  const stats = fs.statSync(pdfPath)
  console.log(`[PDF Generator] Sukses! File PDF berhasil dibuat:`)
  console.log(`- Lokasi: ${pdfPath}`)
  console.log(`- Ukuran: ${(stats.size / 1024).toFixed(1)} KB (${stats.size} bytes)`)
}

generatePdf().catch((err) => {
  console.error('[PDF Generator] Gagal membuat PDF:', err)
  process.exit(1)
})
