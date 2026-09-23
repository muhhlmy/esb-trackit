import { ref } from 'vue'

const savedLang = (typeof localStorage !== 'undefined' && localStorage.getItem('trackit_lang')) || 'id'
const currentLang = ref(savedLang === 'en' ? 'en' : 'id')

const dictionaries = {
  id: {
    account_menu: 'Menu akun',
    clear_search: 'Bersihkan pencarian',
    articles_loading: 'Memuat artikel…',
    knowledge_guides: 'Panduan & pengetahuan',
    articles_empty: 'Artikel belum tersedia. Silakan jelajahi kategori atau hubungi helpdesk.',
    // Navbar
    help_center: 'Help Center',
    search_placeholder_nav: 'Cari panduan & artikel...',
    sign_in: 'Masuk',
    dashboard: 'Dashboard',
    my_asset: 'Aset Saya',
    my_tickets: 'Tiket Saya',
    sign_out: 'Keluar',

    // Home Hero
    hero_tag: 'Pusat Bantuan',
    hero_title: 'Apa yang bisa kami bantu?',
    hero_subtitle: 'Temukan panduan, langkah troubleshooting, dan artikel IT — tanpa antrean.',
    search_placeholder: 'Cari basis pengetahuan...',
    search_btn: 'Cari',
    popular_searches: 'Pencarian populer',

    // Topics
    browse_topics: 'Jelajahi Topik',
    view_all_articles: 'Lihat Semua Artikel',
    learn_more: 'Pelajari Selengkapnya',

    // Topic Cards (fallback & translations)
    topic_it_title: 'IT Support',
    topic_it_desc: 'Setup perangkat, permintaan laptop, instalasi software, dan akses jaringan.',
    topic_hr_title: 'Human Resources (HR)',
    topic_hr_desc: 'Akun Google Workspace, onboarding, 2SV, dan pengaturan hak akses.',
    topic_ga_title: 'General Affairs (GA)',
    topic_ga_desc: 'Pengadaan aset kantor, inventaris, dan layanan operasional gedung.',

    // Featured Articles
    featured_articles: 'Artikel Unggulan',
    view_all_sops: 'Lihat Semua Artikel',

    // FAQ
    faq_tag: 'FAQ',
    faq_title: 'Pertanyaan yang sering diajukan',

    // Assistance section
    need_assistance_title: 'Butuh Bantuan Personal?',
    need_assistance_desc: 'Belum nemu jawabannya? Tim IT Support siap bantu langsung.',
    submit_ticket: 'Kirim Tiket',
    sign_in_to_submit: 'Masuk untuk Kirim Tiket',
    go_to_dashboard: 'Buka Dashboard',
    active_support: 'Dukungan Aktif',
    it_helpdesk: 'Layanan IT Helpdesk',
    work_days: 'Sen - Jum',
    work_hours: '08:30 - 17:30',
  },
  en: {
    account_menu: 'Account menu',
    clear_search: 'Clear search',
    articles_loading: 'Loading articles…',
    knowledge_guides: 'Guides & knowledge',
    articles_empty: 'No articles available yet. Browse a topic or contact the helpdesk.',
    // Navbar
    help_center: 'Help Center',
    search_placeholder_nav: 'Search guides & articles...',
    sign_in: 'Sign In',
    dashboard: 'Dashboard',
    my_asset: 'My Asset',
    my_tickets: 'My Tickets',
    sign_out: 'Sign Out',

    // Home Hero
    hero_tag: 'Help Center',
    hero_title: 'What can we help you find?',
    hero_subtitle: 'Find guides, troubleshooting steps, and IT articles — no waiting in line.',
    search_placeholder: 'Search the knowledge base...',
    search_btn: 'Search',
    popular_searches: 'Popular searches',

    // Topics
    browse_topics: 'Browse topics',
    view_all_articles: 'View all Articles',
    learn_more: 'Learn More',

    // Topic Cards (fallback & translations)
    topic_it_title: 'IT Support',
    topic_it_desc: 'Device setup, laptop requests, software installs, and network access.',
    topic_hr_title: 'Human Resources (HR)',
    topic_hr_desc: 'Google Workspace accounts, onboarding, 2SV, and access permissions.',
    topic_ga_title: 'General Affairs (GA)',
    topic_ga_desc: 'Office asset procurement, inventory, and building operations.',

    // Featured Articles
    featured_articles: 'Featured Articles',
    view_all_sops: 'View all Articles',

    // FAQ
    faq_tag: 'FAQ',
    faq_title: 'Frequently asked questions',

    // Assistance section
    need_assistance_title: 'Need Personal Assistance?',
    need_assistance_desc: "Can't find the answer? Our IT Support team is ready to help directly.",
    submit_ticket: 'Submit a Ticket',
    sign_in_to_submit: 'Sign In to Submit a Ticket',
    go_to_dashboard: 'Go to Dashboard',
    active_support: 'Active Support',
    it_helpdesk: 'IT Helpdesk Support',
    work_days: 'Mon - Fri',
    work_hours: '08:30 - 17:30',
  },
}

export function useLanguage() {
  function setLanguage(lang) {
    if (lang !== 'id' && lang !== 'en') return
    currentLang.value = lang
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('trackit_lang', lang)
    }
  }

  function toggleLanguage() {
    setLanguage(currentLang.value === 'id' ? 'en' : 'id')
  }

  function t(key, fallback = '') {
    const dict = dictionaries[currentLang.value] || dictionaries.id
    return dict[key] || fallback || key
  }

  return {
    currentLang,
    setLanguage,
    toggleLanguage,
    t,
  }
}
