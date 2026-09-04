import { ref, computed } from 'vue';
import { api } from '../services/api.js';
import { useAuth } from './useAuth.js';
import { useToast } from './useToast.js';

// Bookmark disimpan sebagai array of case_id (number) agar kompatibel
// dengan konsumen yang sudah ada: CaseCard, CaseReader, NotionTreeSidebar.
const bookmarks = ref(JSON.parse(localStorage.getItem('esb_bookmarks') || '[]'));

// Anti double-fetch & anti double-toggle (race guard per case_id)
let fetchPromise = null;
const pendingToggles = new Set();

function persistLocal() {
  localStorage.setItem('esb_bookmarks', JSON.stringify(bookmarks.value));
}

export function useBookmarks() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  function isBookmarked(caseId) {
    return bookmarks.value.includes(Number(caseId));
  }

  // Sinkronisasi awal dari server (case_bookmarks) ke state lokal.
  // Untuk user login: server adalah sumber kebenaran (tersinkron antar device).
  // Untuk guest: tetap memakai localStorage.
  async function syncBookmarks() {
    if (!isAuthenticated.value) return;
    if (fetchPromise) return fetchPromise;

    fetchPromise = (async () => {
      try {
        const data = await api.getCaseBookmarks();
        const list = Array.isArray(data) ? data : data?.data || [];
        bookmarks.value = list.map((b) => Number(b.case_id)).filter(Number.isFinite);
        persistLocal();
      } catch (err) {
        console.warn('Gagal menyinkronkan bookmark dari server:', err.message);
      } finally {
        fetchPromise = null;
      }
    })();

    return fetchPromise;
  }

  // Toggle bookmark dengan optimistic update + rollback saat gagal.
  async function toggleBookmark(caseId) {
    const id = Number(caseId);
    if (!Number.isFinite(id)) return;

    const wasBookmarked = isBookmarked(id);

    // Guest (belum login): localStorage saja, tidak ada sinkronisasi server.
    if (!isAuthenticated.value) {
      bookmarks.value = wasBookmarked
        ? bookmarks.value.filter((x) => x !== id)
        : [...bookmarks.value, id];
      persistLocal();
      return;
    }

    if (pendingToggles.has(id)) return;
    pendingToggles.add(id);

    // Optimistic update
    bookmarks.value = wasBookmarked
      ? bookmarks.value.filter((x) => x !== id)
      : [...bookmarks.value, id];
    persistLocal();

    try {
      if (wasBookmarked) {
        await api.removeCaseBookmark(id);
      } else {
        await api.addCaseBookmark(id);
      }
    } catch (err) {
      // Rollback ke kondisi sebelum toggle + beri umpan balik ke user.
      bookmarks.value = wasBookmarked
        ? [...bookmarks.value, id]
        : bookmarks.value.filter((x) => x !== id);
      persistLocal();
      showToast('Gagal memperbarui bookmark. Silakan coba lagi.', 'error');
    } finally {
      pendingToggles.delete(id);
    }
  }

  const bookmarkCount = computed(() => bookmarks.value.length);

  return {
    bookmarks,
    bookmarkCount,
    isBookmarked,
    toggleBookmark,
    syncBookmarks
  };
}
