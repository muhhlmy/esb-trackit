# Dogfood Report: TrackIT

| Field | Value |
|-------|-------|
| **Date** | September 2, 2026 |
| **App URL** | http://localhost:5173/ |
| **Session** | trackit-dogfood |
| **Scope** | Full app (Help Center, Login, Dashboard, Aset IT, Tickets) |

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 1 |
| **Total** | **1** |

## Issues

### ISSUE-001: GSAP Animation Targets Missing in Console

| Field | Value |
|-------|-------|
| **Severity** | low |
| **Category** | console |
| **URL** | http://localhost:5173/ |
| **Repro Video** | N/A |
| **Status** | OPEN (kosmetik) |

**Description**

Multiple GSAP animation warnings appear in the browser console on page load for both Help Center and Dashboard pages: "GSAP target .gsap-sop-item not found". These warnings indicate that the frontend is trying to animate DOM elements that do not exist in the current page structure, leading to unnecessary console noise.

**Repro Steps**

1. Open http://localhost:5173/
2. Open browser DevTools console
3. Observe: 3 GSAP warnings about missing targets

---

## Retracted Issues (False Positives)

### ~~ISSUE-002: Aset IT Detail Page Not Accessible~~ — RETRACTED

**Reason:** Klik row aset TIDAK melakukan navigasi route — memang by design membuka **modal "Detail Aset"** (`AssetsView.vue:877` → `openDetails()` → `showDetailsModal`, modal di `AssetsView.vue:1439`).

**Verifikasi ulang (2 Sep 2026):** Klik row pertama `PG-HST-TEST-1` → modal "Detail Aset" terbuka dengan tab Informasi Detail & Log Perubahan. Bukti: `screenshots/issue-002-verified-modal.png`.

Kesalahan awal: agent-browser melaporkan "element covered by modal-backdrop" — itu justru bukti modal berhasil terbuka, bukan bug.

### ~~ISSUE-003: Ticket Creation Fails Silently~~ — RETRACTED

**Reason:** Submit tiket **berhasil**. Tiket `TKT-2026-000001` terbentuk via UI (judul "Test dogfood ticket"), tersimpan di DB, dan tampil di Ticket Inbox.

**Verifikasi ulang (2 Sep 2026):** `/tickets` menampilkan tiket TKT-2026-000001 di list. Bukti: `screenshots/issue-003-verified-ticket-list.png`.

Kesalahan awal: saat verifikasi pertama, auth session expired menyebabkan redirect ke login → list tampak kosong. Setelah re-login, tiket terlihat. Satu-satunya gap UX: **tidak ada toast sukses yang terlihat saat submit** (toast mungkin sudah muncul tapi tertutup oleh closeModal/fetch). Perlu cek manual bila dianggap perlu.

---

## Root Cause false positive

1. Auth session JWT pendek → snapshot ref expired di tengah alur → salah interpretasi.
2. Modal-based UI (bukan route-based) → tool snapshot berbasis navigation salah membaca perilaku.
