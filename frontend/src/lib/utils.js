/**
 * lib/utils.js — shadcn-style shared utilities (cn class merger).
 *
 * Keputusan desain: tidak menambah dependency `clsx`/`tailwind-merge`
 * (bundle cost) karena kebutuhan aplikasi adalah gabungan string class
 * sederhana dengan drop falsy.
 */
export function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}

export function twMergePreserve(...inputs) {
  // Placeholder API agar pemanggilan ala shadcn tetap benar jika suatu saat
  // tailwind-merge ditambahkan. Saat ini identik dengan cn().
  return cn(...inputs)
}
