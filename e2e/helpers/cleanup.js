const API_BASE_URL = process.env.E2E_API_URL || "http://localhost:3000";

export async function cleanupE2ETestData(request) {
  try {
    const assetsRes = await request.get(
      `${API_BASE_URL}/api/assets?all=true`,
      {},
    );

    if (assetsRes.ok()) {
      const assets = await assetsRes.json();
      if (Array.isArray(assets)) {
        const e2eAssets = assets.filter(
          (a) =>
            (a.hostname && a.hostname.startsWith("E2E-")) ||
            (a.serial_number && a.serial_number.startsWith("E2E-")) ||
            (a.note_asset && a.note_asset.startsWith("E2E-")),
        );

        for (const asset of e2eAssets) {
          await request.delete(`${API_BASE_URL}/api/assets/${asset.id}`, {});
        }
      }
    }
  } catch (err) {
    console.warn("Cleanup non-fatal warning:", err.message);
  }
}
