import { ref } from 'vue';

const savedLang = (typeof localStorage !== 'undefined' && localStorage.getItem('esb_lang')) || 'id';
const currentLang = ref(savedLang === 'en' ? 'en' : 'id');

const dictionaries = {
  id: {
    // Navbar
    help_center: 'Help Center',
    search_placeholder_nav: 'Cari panduan SOP & artikel...',
    sign_in: 'Masuk',
    dashboard: 'Dashboard',
    my_asset: 'Aset Saya',
    my_tickets: 'Tiket Saya',
    sign_out: 'Keluar',

    // Home Hero
    hero_tag: 'Pusat Bantuan',
    hero_title: 'Apa yang bisa kami bantu?',
    hero_subtitle: 'Cari SOP, panduan troubleshooting, dan artikel basis pengetahuan IT kami.',
    search_placeholder: 'Cari basis pengetahuan...',
    search_btn: 'Cari',
    popular_searches: 'Pencarian populer',

    // Topics
    browse_topics: 'Jelajahi Topik',
    view_all_articles: 'Lihat Semua Artikel',
    learn_more: 'Pelajari Selengkapnya',

    // Topic Cards (fallback & translations)
    topic_it_title: 'IT Support',
    topic_it_desc: 'Pelajari dasar penyiapan profil IT, permintaan laptop, software, dan koneksi jaringan.',
    topic_hr_title: 'Human Resources (HR)',
    topic_hr_desc: 'Kelola preferensi akun, Google Workspace, onboarding karyawan, 2SV, dan hak akses.',
    topic_ga_title: 'General Affairs (GA)',
    topic_ga_desc: 'Layanan operasional kantor, pengadaan aset fasilitas GA, inventaris gedung, dan kebutuhan kerja.',

    // Featured SOPs
    featured_articles: 'Artikel Unggulan',
    view_all_sops: 'Lihat Semua Artikel',

    // FAQ
    faq_tag: 'PERTANYAAN SEPUTAR HELPDESK',
    faq_title: 'Pertanyaan Umum & Troubleshooting',

    // Assistance section
    need_assistance_title: 'Butuh Bantuan Personal?',
    need_assistance_desc: 'Jika Anda belum menemukan informasi yang dibutuhkan, tim IT Support kami siap membantu Anda secara langsung.',
    submit_ticket: 'Kirim Tiket',
    sign_in_to_submit: 'Masuk untuk Kirim Tiket',
    go_to_dashboard: 'Buka Dashboard',
    active_support: 'Dukungan Aktif',
    it_helpdesk: 'Layanan IT Helpdesk',
    work_days: 'Sen - Jum',
    work_hours: '08:30 - 17:30',
  },
  en: {
    // Navbar
    help_center: 'Help Center',
    search_placeholder_nav: 'Search SOP guides & articles...',
    sign_in: 'Sign In',
    dashboard: 'Dashboard',
    my_asset: 'My Asset',
    my_tickets: 'My Tickets',
    sign_out: 'Sign Out',

    // Home Hero
    hero_tag: 'Help Center',
    hero_title: 'What can we help you find?',
    hero_subtitle: 'Search our SOPs, troubleshooting guides, and IT knowledge base.',
    search_placeholder: 'Search the knowledge base...',
    search_btn: 'Search',
    popular_searches: 'Popular searches',

    // Topics
    browse_topics: 'Browse topics',
    view_all_articles: 'View all Articles',
    learn_more: 'Learn More',

    // Topic Cards (fallback & translations)
    topic_it_title: 'IT Support',
    topic_it_desc: 'Learn the basics of setting up your IT profile, laptop requests, software, and connecting network tools.',
    topic_hr_title: 'Human Resources (HR)',
    topic_hr_desc: 'Customize your experience with account settings, Google Workspace, onboarding, 2SV, and permissions.',
    topic_ga_title: 'General Affairs (GA)',
    topic_ga_desc: 'Office facility management, physical asset requests, building maintenance, and operational tools.',

    // Featured SOPs
    featured_articles: 'Featured Articles',
    view_all_sops: 'View all Articles',

    // FAQ
    faq_tag: 'FREQUENTLY ASKED QUESTIONS',
    faq_title: 'Frequently Asked Questions & Troubleshooting',

    // Assistance section
    need_assistance_title: 'Need Personal Assistance?',
    need_assistance_desc: "If you couldn't find the information you need, our IT support team is ready to assist you. Submit a ticket to contact support right away.",
    submit_ticket: 'Submit a Ticket',
    sign_in_to_submit: 'Sign In to Submit a Ticket',
    go_to_dashboard: 'Go to Dashboard',
    active_support: 'Active Support',
    it_helpdesk: 'IT Helpdesk Support',
    work_days: 'Mon - Fri',
    work_hours: '08:30 - 17:30',
  }
};

export function useLanguage() {
  function setLanguage(lang) {
    if (lang !== 'id' && lang !== 'en') return;
    currentLang.value = lang;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('esb_lang', lang);
    }
  }

  function toggleLanguage() {
    setLanguage(currentLang.value === 'id' ? 'en' : 'id');
  }

  function t(key, fallback = '') {
    const dict = dictionaries[currentLang.value] || dictionaries.id;
    return dict[key] || fallback || key;
  }

  return {
    currentLang,
    setLanguage,
    toggleLanguage,
    t,
  };
}
