// Isolated static build: every API intercepted; external traffic blocked.
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, join } from "node:path";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
const root = resolve("frontend/dist");
const evidence = resolve(process.env.TMPDIR, "cases-ui-evidence");
await mkdir(evidence, { recursive: true });
let fontUrls = [];
try {
  fontUrls = JSON.parse(
    await readFile(join(evidence, "font-urls.json"), "utf8"),
  );
} catch {
  /* Optional offline font cache. */
}
async function fontRoute(route, url) {
  if (
    url.hostname === "fonts.googleapis.com" &&
    url.search.includes("Plus+Jakarta")
  ) {
    await route.fulfill({
      contentType: "text/css",
      body: await readFile(join(evidence, "font.css")),
    });
    return true;
  }
  const index = fontUrls.indexOf(url.href);
  if (index >= 0) {
    await route.fulfill({
      contentType: "font/ttf",
      body: await readFile(join(evidence, `font-${index}.bin`)),
    });
    return true;
  }
  return false;
}
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (path.startsWith("/api/")) {
    res.writeHead(500);
    res.end("Unmocked API");
    return;
  }
  try {
    const file =
      path.startsWith("/static/") || /\.(svg|png|ico)$/.test(path)
        ? resolve(root, "." + path)
        : resolve(root, "index.html");
    res.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".svg": "image/svg+xml",
        ".png": "image/png",
      }[extname(file)] || "application/octet-stream",
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
const widths = (process.env.WIDTHS || "360,390,768,1024,1440,1920")
  .split(",")
  .map(Number);
const results = [];
const normalContent =
  '<h2>Langkah penanganan</h2><p>Periksa sambungan dan <strong>konfigurasi perangkat</strong>. Simpan pekerjaan sebelum memulai ulang.</p><ol><li>Periksa indikator jaringan.</li><li>Hubungkan ulang kabel.</li></ol><blockquote><em>Hubungi tim IT jika masalah berulang.</em></blockquote><a href="https://example.com/help">Dokumentasi</a><script>window.fixtureXss=true</script><img src="x" onerror="window.fixtureXss=true">';
function records(state) {
  if (state === "empty" || state === "error") return [];
  const long = "Perangkat".repeat(45);
  return [
    {
      id: 11,
      title: state === "long" ? long : "Mengatasi printer tidak terhubung",
      category: "hardware",
      severity: "high",
      summary:
        state === "long"
          ? long
          : "Pulihkan koneksi printer kantor melalui pemeriksaan kabel dan jaringan.",
      contentHtml:
        normalContent +
        (state === "long"
          ? `<p>${long}</p><pre><code>${long}</code></pre><table><tbody><tr>${Array.from({ length: 8 }, () => `<td>${long}</td>`).join("")}</tr></tbody></table>`
          : ""),
    },
    {
      id: 12,
      title: "Mengatur aplikasi email",
      category: "software",
      severity: "medium",
      summary: "Panduan sinkronisasi kotak masuk.",
      contentHtml: "<h2>Sinkronisasi email</h2><p>Periksa pengaturan akun.</p>",
    },
    {
      id: 13,
      title: "Panduan perangkat cadangan",
      category: "hardware",
      severity: "low",
      summary: "Dokumen tanpa konten.",
      contentHtml: "",
    },
  ];
}
async function geometry(page, label) {
  await page.evaluate(() => document.fonts.ready);
  const g = await page.locator(".cases-page").evaluate((root) => {
    const visible = (e) =>
      !!e.getClientRects().length &&
      !e.closest("[inert]") &&
      getComputedStyle(e).visibility !== "hidden";
    const buttons = [...root.querySelectorAll("button")]
      .filter(visible)
      .map((e) => {
        const r = e.getBoundingClientRect(),
          s = getComputedStyle(e);
        return {
          text: e.textContent.trim() || e.title || e.getAttribute("aria-label"),
          width: r.width,
          height: r.height,
          padding: s.padding,
          radius: s.borderRadius,
          font: s.fontSize,
        };
      });
    const containers = [
      ...root.querySelectorAll(
        ".cases-workspace,.cases-canvas,.cases-scroll,.case-reader,.doc-body,.case-tree:not([inert]),.case-tree-list,.case-summary,.case-escalation",
      ),
    ]
      .filter(visible)
      .map((e) => ({
        name: e.className.split(" ")[0],
        width: e.clientWidth,
        scroll: e.scrollWidth,
      }));
    return {
      pageWidth: document.documentElement.scrollWidth,
      viewport: innerWidth,
      buttons,
      containers,
      font: getComputedStyle(root).fontFamily,
      gap: getComputedStyle(root).gap,
      loadedFonts: [...document.fonts]
        .filter((f) => f.status === "loaded")
        .map((f) => f.family),
    };
  });
  assert.ok(
    g.pageWidth <= g.viewport,
    `${label} page overflow ${JSON.stringify(g)}`,
  );
  for (const c of g.containers)
    assert.ok(
      c.scroll <= c.width + 1,
      `${label} component overflow ${JSON.stringify(c)}`,
    );
  for (const b of g.buttons)
    assert.ok(
      b.width >= 44 && b.height >= 44,
      `${label} touch target ${JSON.stringify(b)}`,
    );
  assert.match(g.font, /Plus Jakarta Sans/);
  if (fontUrls.length)
    assert.ok(
      g.loadedFonts.some((f) => f.includes("Plus Jakarta Sans")),
      "Font must actually load",
    );
  if (await page.locator(".doc-body").count())
    assert.equal(
      await page
        .locator(".doc-body")
        .evaluate((e) => getComputedStyle(e).fontSize),
      "15px",
    );
  return g;
}
try {
  for (const width of widths)
    for (const state of ["normal", "empty", "error", "long"]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
      });
      const errors = [],
        requests = [];
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (fontUrls.length && (await fontRoute(route, url))) return;
        if (url.origin !== origin) return route.abort();
        if (!url.pathname.startsWith("/api/")) return route.continue();
        requests.push({ path: url.pathname, method: route.request().method() });
        assert.equal(route.request().method(), "GET");
        if (url.pathname === "/api/auth/me")
          return route.fulfill({
            status: 401,
            json: { message: "Guest fixture" },
          });
        if (url.pathname === "/api/cases/public")
          return route.fulfill({
            status: state === "error" ? 503 : 200,
            json:
              state === "error"
                ? { message: "Fixture service unavailable" }
                : records(state),
          });
        return route.fulfill({ json: [] });
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin + "/cases");
      await expect(page.locator(".cases-heading")).toHaveCount(0);
      await expect(page.locator(".cases-workspace")).toBeVisible();
      if (state === "normal" || state === "long")
        await expect(page.locator(".case-reader h1")).toHaveText(
          records(state)[0].title,
        );
      else await expect(page.locator(".case-reader-empty")).toBeVisible();
      const g = await geometry(page, `${width}/${state}`);
      if (state === "normal" || state === "long") {
        await expect(page).toHaveURL(/\/cases\/11$/);
        assert.equal(await page.evaluate(() => window.fixtureXss), undefined);
        await expect(
          page.locator(".doc-body script,.doc-body [onerror]"),
        ).toHaveCount(0);
        await page.getByRole("button", { name: /Simpan bookmark|Hapus bookmark/ }).click();
        await expect(
          page.getByRole("button", { name: /Simpan bookmark|Hapus bookmark/ }),
        ).toHaveAttribute("aria-pressed", "true");
        assert.deepEqual(
          await page.evaluate(() =>
            JSON.parse(localStorage.getItem("trackit_bookmarks")),
          ),
          [11],
        );
        await page.getByRole("button", { name: /Simpan bookmark|Hapus bookmark/ }).click();
        await expect(
          page.getByRole("button", { name: /Simpan bookmark|Hapus bookmark/ }),
        ).toHaveAttribute("aria-pressed", "false");
        await expect(
          page.getByRole("button", { name: "Edit Document" }),
        ).toHaveCount(0);
      }
      if (width < 768)
        await page
          .getByRole("button", { name: "Buka daftar artikel", exact: true })
          .click();
      const tree = page.locator(
        width < 768
          ? ".cases-mobile-tree .case-tree"
          : ".cases-desktop-tree .case-tree",
      );
      await expect(
        tree.getByRole("textbox", { name: "Cari artikel dalam daftar" }),
      ).toBeVisible();
      await geometry(page, `${width}/${state}/tree`);
      if (state === "normal" || state === "long") {
        await tree
          .getByRole("textbox", { name: "Cari artikel dalam daftar" })
          .fill("sinkronisasi");
        await expect(tree.locator("[data-case-link]")).toHaveCount(1);
        await expect(
          tree.getByRole("button", { name: "Mengatur aplikasi email" }),
        ).toBeVisible();
        await tree
          .getByRole("textbox", { name: "Cari artikel dalam daftar" })
          .fill("tidak-ada-hasil");
        await expect(tree.getByRole("status")).toHaveText(
          "Tidak ada artikel yang ditampilkan.",
        );
        await expect(tree.locator("[data-case-link]")).toHaveCount(0);
        await tree.getByRole("textbox", { name: "Cari artikel dalam daftar" }).fill("");
        const category = tree.getByRole("button", {
          name: /Hardware & Equipment/,
        });
        await category.click();
        await expect(category).toHaveAttribute("aria-expanded", "false");
        await expect(tree.locator("[data-case-link]")).toHaveCount(1);
        await category.click();
        await expect(tree.locator("[data-case-link]")).toHaveCount(3);
        await tree
          .getByRole("button", { name: "Mengatur aplikasi email" })
          .click();
        await expect(page.locator(".case-reader h1")).toHaveText(
          "Mengatur aplikasi email",
        );
        await expect(page).toHaveURL(/\/cases\/12$/);
        if (width < 768)
          await expect(page.locator(".cases-mobile-tree")).toHaveCount(0);
        await page.goto(origin + "/cases/13");
        await expect(page.locator(".case-reader")).toContainText(
          "Dokumen ini belum memiliki isi konten.",
        );
        await page.goto(origin + "/cases/11");
        await expect(page.locator(".case-reader h1")).toHaveText(
          records(state)[0].title,
        );
        if (state === "normal") {
          await page.evaluate(() =>
            document.documentElement.classList.add("dark"),
          );
          assert.equal(
            await page
              .locator(".doc-body h2")
              .evaluate((e) => getComputedStyle(e).color),
            "rgb(248, 250, 252)",
          );
          await geometry(page, `${width}/dark`);
          await page.evaluate(() =>
            document.documentElement.classList.remove("dark"),
          );
        }
        if (state === "normal")
          await page.screenshot({
            path: join(evidence, `cases-${width}.png`),
            fullPage: true,
          });
        await page.getByRole("button", { name: "Submit a Ticket" }).click();
        await expect(page).toHaveURL(/\/login$/);
      } else if (width < 768) {
        await page
          .getByRole("button", { name: "Tutup daftar artikel" })
          .click();
        await expect(page.locator(".cases-mobile-tree")).toHaveCount(0);
      }
      assert.deepEqual(errors, []);
      const result = { width, state, geometry: g, requests, errors };
      results.push(result);
      await writeFile(
        join(evidence, "fixture-results.json"),
        JSON.stringify(results, null, 2),
      );
      console.log(`PASS ${width} ${state}`);
      await context.close();
    }
  for (const width of widths)
    for (const permission of ["full", "read_only", "none"]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
      });
      const user = {
        id: 1,
        nama: "Fixture",
        role: "admin",
        permissions: { knowledge_base: permission, tickets: "full" },
      };
      await context.addInitScript(
        (user) => localStorage.setItem("user", JSON.stringify(user)),
        user,
      );
      const requests = [];
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (fontUrls.length && (await fontRoute(route, url))) return;
        if (url.origin !== origin) return route.abort();
        if (!url.pathname.startsWith("/api/")) return route.continue();
        requests.push({ path: url.pathname, method: route.request().method() });
        if (route.request().method() !== "GET") {
          assert.match(url.pathname, /^\/api\/case-bookmarks\/11$/);
          return route.fulfill({ json: { success: true } });
        }
        return route.fulfill({
          json:
            url.pathname === "/api/auth/me"
              ? user
              : url.pathname === "/api/cases/public"
                ? records("normal")
                : [],
        });
      });
      const page = await context.newPage();
      await page.goto(origin + "/cases/11");
      await expect(page.locator(".case-reader h1")).toHaveText(
        records("normal")[0].title,
      );
      await expect(
        page.getByRole("button", { name: "Edit Document" }),
      ).toHaveCount(permission === "full" ? 1 : 0);
      const g = await geometry(page, `${width}/${permission}`);
      if (permission === "full") {
        const sizes = await page
          .locator(".case-actions button")
          .evaluateAll((buttons) =>
            buttons.map((e) => {
              const r = e.getBoundingClientRect(),
                s = getComputedStyle(e);
              return {
                height: r.height,
                y: r.y,
                padding: s.padding,
                radius: s.borderRadius,
                font: s.fontSize,
              };
            }),
          );
        assert.deepEqual(sizes[0], sizes[1]);
        await page.getByRole("button", { name: /Simpan bookmark|Hapus bookmark/ }).click();
        await expect(
          page.getByRole("button", { name: /Simpan bookmark|Hapus bookmark/ }),
        ).toHaveAttribute("aria-pressed", "true");
        await page.getByRole("button", { name: /Simpan bookmark|Hapus bookmark/ }).click();
        await expect(
          page.getByRole("button", { name: /Simpan bookmark|Hapus bookmark/ }),
        ).toHaveAttribute("aria-pressed", "false");
        await page.getByRole("button", { name: "Edit Document" }).click();
        await expect(page).toHaveURL(/\/admin\/editor\/11$/);
      }
      if (width >= 768) {
        await page.goto(origin + "/cases/11");
        await page.getByRole("button", { name: "Hide Tree" }).click();
        await expect(
          page.locator(".cases-desktop-tree .case-tree"),
        ).toHaveAttribute("inert", "");
        await page.getByRole("button", { name: "Show Tree" }).click();
        await expect(
          page.locator(".cases-desktop-tree .case-tree"),
        ).not.toHaveAttribute("inert", "");
      }
      results.push({ width, permission, geometry: g, requests });
      await writeFile(
        join(evidence, "fixture-results.json"),
        JSON.stringify(results, null, 2),
      );
      console.log(`PASS ${width} permission=${permission}`);
      await context.close();
    }
  assert.equal(results.length, widths.length * 7);
  console.log(`Verified ${results.length} scenarios; evidence ${evidence}`);
} finally {
  await browser.close();
  server.close();
}
