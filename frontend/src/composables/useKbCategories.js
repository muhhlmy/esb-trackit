import { ref, computed } from 'vue';
import { api } from '../services/api.js';
import { useToast } from './useToast.js';

const categories = ref([]);
const isLoading = ref(false);

function normalizeCategory(c) {
  return c ? { ...c, id: Number(c.id) } : null;
}

function normalizeList(data) {
  const list = Array.isArray(data) ? data : data?.data || [];
  return list.map(normalizeCategory).filter(Boolean);
}

export function useKbCategories() {
  const { showToast } = useToast();

  // Public Help Center: hanya kategori PUBLISHED
  async function fetchPublicCategories() {
    isLoading.value = true;
    try {
      categories.value = normalizeList(await api.getPublicKbCategories());
    } catch (err) {
      console.warn('Gagal memuat kategori KB:', err.message);
      categories.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  // Admin CMS: semua kategori (termasuk DRAFT)
  async function fetchAllCategories() {
    isLoading.value = true;
    try {
      categories.value = normalizeList(await api.getKbCategories());
    } catch (err) {
      console.warn('Gagal memuat kategori KB:', err.message);
      categories.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function saveCategory(data) {
    const existingId = data?.id ? Number(data.id) : null;
    const payload = {
      key: data.key,
      title: data.title,
      description: data.description ?? '',
      icon: data.icon || 'HelpCircle',
      is_featured: Boolean(data.is_featured),
      sort_order: Number(data.sort_order ?? 0),
      status: data.status || 'PUBLISHED',
    };
    try {
      if (existingId) {
        const updated = normalizeCategory(await api.updateKbCategory(existingId, payload));
        const idx = categories.value.findIndex((c) => c.id === updated.id);
        if (idx !== -1) categories.value[idx] = updated;
        showToast('Kategori berhasil diperbarui!', 'success');
      } else {
        const created = normalizeCategory(await api.createKbCategory(payload));
        categories.value.push(created);
        showToast('Kategori baru berhasil dibuat!', 'success');
      }
      return true;
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan kategori.', 'error');
      return false;
    }
  }

  async function deleteCategory(id) {
    try {
      await api.deleteKbCategory(id);
      categories.value = categories.value.filter((c) => Number(c.id) !== Number(id));
      showToast('Kategori berhasil dihapus.', 'info');
      return true;
    } catch (err) {
      showToast(err.message || 'Gagal menghapus kategori.', 'error');
      return false;
    }
  }

  const publishedCategories = computed(() =>
    categories.value.filter((c) => c.status === 'PUBLISHED')
  );

  return {
    categories,
    publishedCategories,
    isLoading,
    fetchPublicCategories,
    fetchAllCategories,
    saveCategory,
    deleteCategory,
  };
}
