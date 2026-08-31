import { ref, computed } from 'vue';

const bookmarks = ref(JSON.parse(localStorage.getItem('esb_bookmarks') || '[]'));

export function useBookmarks() {
  function isBookmarked(caseId) {
    return bookmarks.value.includes(caseId);
  }

  function toggleBookmark(caseId) {
    if (isBookmarked(caseId)) {
      bookmarks.value = bookmarks.value.filter((id) => id !== caseId);
    } else {
      bookmarks.value.push(caseId);
    }
    localStorage.setItem('esb_bookmarks', JSON.stringify(bookmarks.value));
  }

  const bookmarkCount = computed(() => bookmarks.value.length);

  return {
    bookmarks,
    bookmarkCount,
    isBookmarked,
    toggleBookmark
  };
}
