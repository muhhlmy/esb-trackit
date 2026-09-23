/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Brand Colors
        "brand-primary": "#0A51B0",
        "brand-primary-dark": "#0A4391",
        "brand-primary-light": "#5AB1FF",
        "brand-secondary": "#49BEFF",
        "brand-success": "#13DEB9",
        "brand-warning": "#FFAE1F",
        "brand-danger": "#FA896B",
        "brand-purple": "#8B5CF6",
        "brand-gray": "#64748B",
        "brand-slate": "#64748B",
        
        // Status Colors
        "status-digunakan": "#13DEB9",
        "status-tersedia": "#0A51B0",
        "status-maintenance": "#FFAE1F",
        "status-rusak": "#FA896B",
        "status-disposal": "#8B5CF6",
        
        // Background Colors
        "bg-primary": "#F8FAFC",
        "bg-card": "#FFFFFF",
        "bg-secondary": "#F1F5F9",
        
        // Text Colors
        "text-primary": "#333333",
        "text-secondary": "#64748B",
        "text-muted": "#7C8BAC",
      },
      borderRadius: {
        "lg": "12px",
        "xl": "16px",
      },
      spacing: {
        "1.5": "6px",
        "3.5": "14px",
        "4.5": "18px",
        "5.5": "22px",
        "7.5": "30px",
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "sans-serif"],
        label: ["Plus Jakarta Sans", "sans-serif"],
        body: ["Plus Jakarta Sans", "sans-serif"],
      },
      fontSize: {
        "dashboard-xs": ["0.75rem", { lineHeight: "1.5" }],
        "dashboard-sm": ["0.875rem", { lineHeight: "1.5" }],
        "dashboard-base": ["1rem", { lineHeight: "1.6" }],
        "dashboard-lg": ["1.125rem", { lineHeight: "1.5" }],
        "dashboard-xl": ["1.25rem", { lineHeight: "1.4" }],
        "dashboard-2xl": ["1.5rem", { lineHeight: "1.3" }],
        "dashboard-3xl": ["1.875rem", { lineHeight: "1.3" }],
        "dashboard-4xl": ["2.25rem", { lineHeight: "1.25" }],
      },
      boxShadow: {
        card: "0 2px 8px rgba(15, 23, 42, 0.04)",
        "card-hover": "0 8px 24px rgba(0, 0, 0, 0.06)",
      },
    },
  },
  plugins: [],
}