// Isolated static-build fixture; all APIs mocked, external requests blocked.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
const root = resolve("frontend/dist");
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (path.startsWith("/api/")) {
    res.writeHead(500);
    res.end("Unmocked API");
    return;
  }
  try {
    const file = path.startsWith("/assets/")
      ? resolve(root, "." + path)
      : resolve(root, "index.html");
    res.setHeader(
      "Content-Type",
      { ".js": "text/javascript", ".css": "text/css", ".html": "text/html" }[
        extname(file)
      ] || "application/octet-stream",
    );
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
// Fixture identities never leave this loopback server; no production auth or writes.
try {
  for (const width of [360, 390, 768, 1024, 1440, 1920]) {
    for (const scenario of ["empty", "populated", "error", "csat-error"]) {
    for (const mode of ["full", "read_only", "none"]) {
      if (process.env.STATS_ONLY && (scenario !== 'empty' || mode !== 'full')) continue;
      const permissions = {
        dashboard: "full",
        assets: mode,
        karyawan: mode,
        tickets: mode,
        submissions: mode,
      };
      const user = { id: 1, nama: "Fixture", role: "admin", permissions };
      let releaseStats;
      const statsGate = new Promise(resolve => { releaseStats = resolve; });
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
      });
      await context.addInitScript(
        (user) => localStorage.setItem("user", JSON.stringify(user)),
        user,
      );
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        if (!url.pathname.startsWith("/api/")) return route.continue();
        assert.equal(
          route.request().method(),
          "GET",
          "Fixture must never write",
        );
        let json = [];
        if (url.pathname === "/api/auth/me") json = user;
        if (url.pathname === "/api/assets/stats") {
          if (process.env.STATS_ONLY) await statsGate;
          json = {
            totalAssets: 0,
            byStatus: [],
            byLocation: [],
            recentAssets: [],
          };
        }
        if (url.pathname === "/api/tickets/stats") json = { recentTickets: [] };
        if (scenario === "populated" || scenario === "csat-error") {
          if (url.pathname === "/api/assets/stats") json = {
            totalAssets: 37,
            byStatus: [{status:"In Use",count:23},{status:"Stock",count:9},{status:"In Service",count:3},{status:"Damaged",count:2}],
            byLocation: [{location:"Jakarta",count:24},{location:"Bandung",count:13}],
            byType: [{device_type:"Laptop",count:28},{device_type:"Printer",count:9}],
            byCondition: [{condition:"Baik",count:35},{condition:"Rusak",count:2}],
            monthlyTrend: [{month:"Jul",count:8},{month:"Agu",count:12},{month:"Sep",count:17}],
            recentAssets: Array.from({length:5},(_,i)=>({id_aset:i+1,label_aset:"Perangkat operasional kantor Jakarta " + (i+1),tipe_perangkat:"Laptop",merek:"Lenovo",nomor_seri:"SN-FIXTURE-000000000"+i,kondisi_aset:"Baik",status_aset:"In Use",dibuat_pada:"2026-09-21"}))
          };
          if (url.pathname === "/api/tickets/stats") json = {recentTickets:Array.from({length:5},(_,i)=>({id:i+1,nomor_tiket:"TCK-202609-00"+i,judul:"Permintaan pemeriksaan perangkat dan koneksi jaringan kantor",prioritas:"High",status_tiket:"Open",assigned_to:"Petugas IT",pelapor:"Pelapor Fixture",dibuat_pada:"2026-09-21"}))};
          if (url.pathname === "/api/tickets/casp/stats") json = {averageRating:4.3,totalRatings:17,distribution:[{rating:3,count:2},{rating:4,count:8},{rating:5,count:7}]};
          if (url.pathname === "/api/tickets/casp/trend") json = [{period:"Jul",averageRating:4.1,totalRatings:7},{period:"Agu",averageRating:4.3,totalRatings:10}];
        }
        if ((scenario === "error" && url.pathname === "/api/assets/stats") || (scenario === "csat-error" && url.pathname.startsWith("/api/tickets/casp/"))) return route.fulfill({status:500,json:{message:"Fixture service unavailable"}});
        if (process.env.STATS_ONLY && url.pathname === '/api/assets/stats') json = {...json,totalAssets:1234567890123456,byStatus:[{status:'In Use',count:987654321012345}]};
        return route.fulfill({ json });
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => {
        errors.push(e.message);
        console.error(e.message);
      });
      await page.goto(origin + "/dashboard");
      if (process.env.STATS_ONLY) {
        await page.locator('.dashboard-stat-skeleton').waitFor();
        const skeleton = await page.locator('.dashboard-stat-skeleton').evaluate(el => ({columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,count:el.children.length,overflow:el.scrollWidth > el.clientWidth}));
        assert.equal(skeleton.columns, width < 640 ? 1 : width < 1280 ? 2 : 5);
        assert.equal(skeleton.count, 5);
        assert.equal(skeleton.overflow, false);
        releaseStats();
      }
      await page.locator('.dashboard-view[data-testid="page-ready"]').waitFor();
      if (scenario !== "error" && mode !== "none") await expect(page.locator(".csat-section")).toBeVisible();
      await page.waitForTimeout(300);
      if (scenario !== 'error') {
        const statsGeometry = await page.locator('.dashboard-stats').evaluate(el => ({columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,cards:[...el.children].map(card => ({padding:getComputedStyle(card).padding,radius:getComputedStyle(card).borderRadius,overflow:card.scrollWidth > card.clientWidth}))}));
        assert.equal(statsGeometry.columns, width < 640 ? 1 : width < 1280 ? 2 : 5);
        assert.equal(statsGeometry.cards.length, 5);
        for (const card of statsGeometry.cards) {
          assert.equal(card.padding, '24px');
          assert.equal(card.radius, '16px');
          assert.equal(card.overflow, false);
        }
      }
      const layout = await page.locator(".dashboard-view").evaluate(el => {
        const measure = e => { const r=e.getBoundingClientRect(), s=getComputedStyle(e); return {height:r.height,width:r.width,x:r.x,y:r.y,padding:s.padding,radius:s.borderRadius,font:s.fontSize,minWidth:s.minWidth}; };
        return {gap:getComputedStyle(el).gap,overflow:document.documentElement.scrollWidth>innerWidth,links:[...el.querySelectorAll(".table-link")].map(measure),quick:[...el.querySelectorAll(".quick-action-card")].map(measure),retry:[...el.querySelectorAll(".dashboard-retry,.csat-retry")].map(measure),panels:[...el.querySelectorAll(".dashboard-panel")].map(measure)};
      });
      assert.equal(layout.overflow,false, `Dashboard overflow ${width}/${mode}/${scenario}`);
      assert.ok(parseFloat(layout.gap)>=24);
      for(const group of [layout.links,layout.quick]) {
        for(const key of ["height","padding","radius","font","minWidth"]) assert.ok(new Set(group.map(x=>x[key])).size<=1,`Unequal ${key}`);
        for(const b of group) assert.ok(b.height>=44 && b.width>=44);
      }
      for(const b of layout.retry) assert.ok(b.height>=44 && b.width>=44);
      if (scenario === "error") await expect(page.locator(".dashboard-error")).toBeVisible();
      if (scenario === "populated") await expect(page.locator(".stat-total .stat-number")).toHaveText("37");
      if (mode === "none") await expect(page.locator(".dashboard-table,.csat-section")).toHaveCount(0);
      console.log(JSON.stringify({width,mode,scenario,layout}));
      const section = page.getByRole("region", { name: "Quick Access" });
      if (process.env.STATS_ONLY) {
        await expect(page.locator('.stat-total .stat-number')).toHaveText('1234567890123456');
        assert.deepEqual(errors, []);
        await context.close();
        continue;
      }
      if (mode === "none") await expect(section).toHaveCount(0);
      else {
        const labels =
          mode === "full"
            ? ["Tambah Aset", "Buat Tiket", "Tambah Karyawan", "Pengajuan BAST"]
            : ["Buat Tiket", "Pengajuan BAST"];
        await expect(section.getByRole("button")).toHaveCount(labels.length);
        for (const name of labels)
          await expect(
            section.getByRole("button", { name, exact: true }),
          ).toBeVisible();
        const geometry = await section.evaluate((el) => {
          const rect = (e) => {
            const r = e.getBoundingClientRect();
            return {
              x: r.x,
              y: r.y,
              bottom: r.bottom,
              width: r.width,
              height: r.height,
            };
          };
          return {
            section: rect(el),
            header: rect(el.previousElementSibling),
            cards: [...el.querySelectorAll("button")].map(rect),
            headerButtons:
              el.previousElementSibling.querySelectorAll("button").length,
          };
        });
        assert.ok(geometry.section.y >= geometry.header.bottom);
        assert.equal(geometry.headerButtons, 0);
        for (const card of geometry.cards)
          assert.ok(card.height >= 44 && card.width >= 44);
        if (width < 640)
          for (let i = 1; i < geometry.cards.length; i++)
            assert.ok(geometry.cards[i].y >= geometry.cards[i - 1].bottom);
        if (width >= 1440)
          assert.equal(new Set(geometry.cards.map((c) => c.y)).size, 1);
        await section
          .getByRole("button", { name: labels[0], exact: true })
          .focus();
        assert.equal(
          await page.evaluate(
            () => getComputedStyle(document.activeElement).outlineStyle,
          ),
          "solid",
        );
        console.log(JSON.stringify({ width, mode, geometry }));
        if (scenario === "empty" && (width === 390 || width === 1440)) {
          for (const motion of ["no-preference", "reduce"]) {
            await page.emulateMedia({ reducedMotion: motion });
            for (const name of labels) {
              await page.goto(origin + "/dashboard");
              await section.getByRole("button", { name, exact: true }).click();
              const path = {
                "Tambah Aset": "/assets",
                "Buat Tiket": "/tickets",
                "Tambah Karyawan": "/karyawan",
                "Pengajuan BAST": "/submissions",
              }[name];
              await expect(page).toHaveURL(new RegExp(path + "(\\?|$)"));
              if (name !== "Pengajuan BAST") {
                await expect(page).toHaveURL(origin + path);
                const dialog = page.getByRole("dialog", {
                  name: {
                    "Tambah Aset": "Tambah Aset IT",
                    "Buat Tiket": "Buat Tiket Baru",
                    "Tambah Karyawan": /Tambah.*Karyawan|Karyawan.*Baru/,
                  }[name],
                });
                await expect(dialog).toBeVisible();
                await expect(dialog.locator("input").first()).toBeVisible();
                await page.waitForTimeout(700); // Past page/modal transition and query cleanup.
                await expect(dialog).toBeVisible();
                console.log(
                  JSON.stringify({
                    width,
                    mode,
                    motion,
                    name,
                    modal: "persistent",
                  }),
                );
              } else
                await expect(
                  page.getByRole("heading", { name: /BAST/ }).first(),
                ).toBeVisible();
            }
          }
        }
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "Horizontal overflow",
      );
      assert.deepEqual(errors, []);
      await context.close();
    }
  }
  }
  console.log(
    process.env.STATS_ONLY ? "PASS: 6 loading and 6 long-number stats cases" : "PASS: 72 responsive/permission cases; destination navigation, BAST access, focus, persistent create dialogs at desktop/mobile in both motion modes, zero page errors",
  );
} finally {
  await browser.close();
  server.close();
}
