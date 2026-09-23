// Isolated built UI. No production auth, external traffic, or API writes.
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
let cases = 0;
const widths = (process.env.WIDTHS || "360,390,768,1024,1440,1920")
  .split(",")
  .map(Number);
async function geometry(locator) {
  return locator.evaluate((el) => {
    const visible = (e) =>
      e.getBoundingClientRect().width && e.getBoundingClientRect().height;
    const measure = (e) => {
      const r = e.getBoundingClientRect(),
        s = getComputedStyle(e);
      return {
        width: r.width,
        height: r.height,
        y: r.y,
        padding: s.padding,
        radius: s.borderRadius,
        font: s.fontSize,
      };
    };
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      internal: [
        ...el.querySelectorAll(
          ".shipment-summary,.shipment-summary > div,.shipment-cards > li,.shipment-table,.modal-body,.shipment-entry-section",
        ),
      ]
        .filter(visible)
        .filter((e) => e.scrollWidth > e.clientWidth + 1)
        .map((e) => e.className),
      buttons: [...el.querySelectorAll("button")].filter(visible).map(measure),
    };
  });
}
async function checkDialog(page, name) {
  const dialog = page.getByRole("dialog", { name, exact: true });
  await expect(dialog).toBeVisible();
  const g = await geometry(dialog);
  assert.equal(g.overflow, false, name);
  assert.deepEqual(g.internal, [], name);
  for (const b of g.buttons)
    assert.ok(
      b.height >= 44 && b.width >= 44,
      `${name} touch ${JSON.stringify(b)}`,
    );
  return dialog;
}
try {
  for (const width of widths)
    for (const scenario of ["populated", "empty", "error", "long-label"])
      for (const mode of ["full", "read_only"]) {
        const user = {
          id: 1,
          nama: "Fixture",
          role: "admin",
          permissions: { shipments: mode, assets: mode, dashboard: "full" },
        };
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
          reducedMotion: "reduce",
        });
        await context.addInitScript(
          (user) => localStorage.setItem("user", JSON.stringify(user)),
          user,
        );
        let requests = 0;
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
          if (url.pathname === "/api/assets") json = [{ id: 1, hostname: "IT-REFERENCE", serial_number: "SN-REF", tipe_perangkat: "Laptop", status: "Stock" }];
          if (url.pathname === "/api/shipments") {
            requests++;
            if (scenario === "error")
              return route.fulfill({
                status: 500,
                json: { message: "Fixture unavailable" },
              });
            const long = scenario === "long-label";
            const data =
              scenario === "empty"
                ? []
                : [
                    "belum_dikirim",
                    "pending",
                    "sedang_dikirim",
                    "diterima",
                    "cancel",
                  ].map((status, i) => ({
                    id: i + 1,
                    request_date: "2026-09-21",
                    recipient_name: long
                      ? "Penerima".repeat(20)
                      : "Dewi Santoso " + i,
                    item_description: long
                      ? "Perangkat".repeat(70)
                      : "Laptop operasional kantor",
                    destination: long ? "Jakarta".repeat(35) : "Kantor Jakarta",
                    tracking_number: long ? "RESI".repeat(25) : "JNE123456",
                    status,
                    delivery_proof_url: "https://example.com/proof",
                  }));
            json = {
              data,
              total: data.length,
              summary: {
                total: data.length,
                belum_dikirim: 1,
                sedang_dikirim: 1,
                diterima: 1,
              },
            };
          }
          return route.fulfill({ json });
        });
        const page = await context.newPage(),
          errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(origin + "/shipments");
        await page
          .locator('.shipments-page[data-testid="page-ready"]')
          .waitFor();
        const area = page.locator(".shipments-page");
        if (scenario === "populated" && mode === "full") {
          const styles = async (target) => target.evaluate(() => {
            const selectors = [".asset-toolbar", ".asset-toolbar h2", ".inventory-actions button", ".asset-toolbar > div:nth-child(2)", ".asset-toolbar input", ".it-list-heading", ".ws-data-table th", ".ws-data-table td"];
            return Object.fromEntries(selectors.map(selector => {
              const el = document.querySelector(selector);
              if (!el) return [selector, null];
              const css = getComputedStyle(el);
              return [selector, Object.fromEntries(["padding", "borderRadius", "fontSize", "gap"].map(key => [key, css[key]]))];
            }));
          });
          const actual = await styles(page);
          const reference = await context.newPage();
          await reference.goto(origin + "/assets");
          await reference.locator('.asset-it-inventory[data-testid="page-ready"]').waitFor();
          const expected = await styles(reference);
          console.log(JSON.stringify({ width, actual, expected, comparison: "Aset IT" }));
          assert.deepEqual(actual, expected, `Aset IT surface consistency at ${width}px`);
          await reference.close();
        }
        const g = await geometry(area);
        assert.equal(g.overflow, false, `${width}/${scenario}/${mode}`);
        assert.deepEqual(g.internal, [], `${width}/${scenario}/${mode}`);
        assert.equal(
          await area.evaluate((el) => getComputedStyle(el).gap),
          "24px",
        );
        for (const layout of ["Kartu", "Tabel"]) {
          await area.getByTitle(`Tampilan ${layout}`).click();
          const state = await geometry(area);
          assert.equal(state.overflow, false);
          assert.deepEqual(state.internal, []);
          if (scenario === "populated" || scenario === "long-label") {
            const rows = area.locator(
              layout === "Tabel" && width >= 1280
                ? ".shipment-table tbody tr"
                : ".shipment-cards > li",
            );
            await expect(rows.first()).toBeVisible();
            await expect(rows).toHaveCount(5);
            await expect(rows.first()).toContainText(
              scenario === "long-label" ? "RESI" : "JNE123456",
            );
          }
        }
        if (mode === "full") {
          const buttons = await area
            .locator(".shipment-header-actions button")
            .evaluateAll((els) =>
              els.map((el) => ({
                height: el.getBoundingClientRect().height,
                y: el.getBoundingClientRect().y,
                padding: getComputedStyle(el).padding,
                radius: getComputedStyle(el).borderRadius,
                font: getComputedStyle(el).fontSize,
              })),
            );
          for (const key of ["height", "padding", "radius", "font"])
            assert.equal(new Set(buttons.map((b) => b[key])).size, 1, key);
          assert.ok(buttons.every((b) => b.height >= 44));
          assert.equal(buttons[1].y, buttons[2].y);
          if (width >= 640)
            assert.equal(new Set(buttons.map((b) => b.y)).size, 1);
          await area
            .getByRole("button", { name: "Tambah Pengiriman", exact: true })
            .first()
            .click();
          let dialog = await checkDialog(page, "Tambah Pengiriman");
          await dialog
            .locator("#shipment-recipient_name")
            .fill("Penerima fixture");
          await dialog
            .getByRole("button", { name: "Batal", exact: true })
            .click();
          await expect(dialog).toHaveCount(0);
          await area
            .getByRole("button", { name: "Import", exact: true })
            .click();
          dialog = await checkDialog(page, "Import Pengiriman");
          await dialog
            .locator("input[type=file]")
            .setInputFiles({
              name: "invalid.txt",
              mimeType: "text/plain",
              buffer: Buffer.from("invalid"),
            });
          await expect(dialog.getByRole("alert")).toContainText(
            "Format tidak didukung",
          );
          await dialog.getByRole("button", { name: "Hapus file" }).click();
          const templateDownload = page.waitForEvent("download");
          await dialog.getByRole("button", { name: "Unduh Template" }).click();
          const template = await templateDownload;
          await dialog
            .locator("input[type=file]")
            .setInputFiles({
              name: template.suggestedFilename(),
              mimeType:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              buffer: await readFile(await template.path()),
            });
          await expect(
            dialog.getByText("1 baris terbaca", { exact: true }),
          ).toBeVisible();
          await expect(
            dialog.getByRole("button", { name: "Import 1 Baris" }),
          ).toBeEnabled();
          await checkDialog(page, "Import Pengiriman");
          await dialog.getByText("Replace All", { exact: true }).click();
          await expect(
            dialog.getByRole("button", { name: "Import 1 Baris" }),
          ).toBeDisabled();
          await expect(dialog.locator("input:not([type])")).toBeVisible();
          await checkDialog(page, "Import Pengiriman");
          await page.keyboard.press("Escape");
          await area
            .getByRole("button", { name: "Export", exact: true })
            .click();
          dialog = await checkDialog(page, "Export Pengiriman");
          if (scenario === "empty" || scenario === "error")
            await expect(
              dialog.getByRole("button", { name: "Unduh XLSX" }),
            ).toBeDisabled();
          else {
            const download = page.waitForEvent("download");
            await dialog.getByRole("button", { name: "Unduh XLSX" }).click();
            assert.match((await download).suggestedFilename(), /\.xlsx$/);
          }
          await page.keyboard.press("Escape");
          if (scenario === "populated" || scenario === "long-label") {
            await area
              .locator("button")
              .filter({ hasText: /^Edit$/ })
              .or(
                area.getByRole("button", {
                  name: "Edit pengiriman",
                  exact: true,
                }),
              )
              .filter({ visible: true })
              .first()
              .click();
            dialog = await checkDialog(page, "Edit Pengiriman");
            await expect(
              dialog.locator("#shipment-recipient_name"),
            ).not.toHaveValue("");
            await page.keyboard.press("Escape");
            await area
              .getByRole("button", { name: /^Hapus$|^Hapus pengiriman$/ })
              .filter({ visible: true })
              .first()
              .click();
            await checkDialog(page, "Hapus Data Pengiriman");
            await page.keyboard.press("Escape");
          }
        } else
          await expect(area.locator(".shipment-header-actions")).toHaveCount(0);
        await area.getByRole("button", { name: "Filter", exact: true }).click();
        let dialog = await checkDialog(page, "Filter Pengiriman");
        await dialog.getByLabel("Tanggal awal").fill("2026-09-01");
        await dialog.getByRole("button", { name: "Terapkan Filter" }).click();
        assert.ok(requests >= 1);
        assert.deepEqual(errors, []);
        console.log(JSON.stringify({ width, scenario, mode, geometry: g }));
        cases++;
        await context.close();
      }
  console.log(
    `PASS ${cases} responsive/state/permission cases; create/edit/filter/import/export/delete presentation; local XLSX download; zero API writes`,
  );
} finally {
  await browser.close();
  server.close();
}
