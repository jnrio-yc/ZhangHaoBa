/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: "#FAF7F1",
          sidebar: "#F7F1E8",
          panel: "#FFFDFC",
          card: "#FFFFFF",
          border: "#EFE8DF",
          borderStrong: "#DED6C9",
          primary: "#10213B",
          primaryHover: "#172B4D",
          text: "#162033",
          textMain: "#1F2937",
          textBody: "#374151",
          textSub: "#6B7280",
          textMuted: "#9CA3AF",
          textWeak: "#C2BDB5",
          placeholder: "#B6B0A8",
          sidebarActive: "#F1E7DC",
          warm: "#D9A441",
          star: "#F5B53F",
          cardHover: "#FFFCF7",
        },
        danger: { DEFAULT: "#D94B4B", light: "#FFF1F0", border: "#F8D2D2" },
        success: { DEFAULT: "#2F9D62", light: "#EAF7EF", border: "#CDEBD8" },
        warning: { DEFAULT: "#D88A16", light: "#FFF4DF", border: "#F4D7A5" },
      },
      borderRadius: {
        vaultSm: "8px",
        vaultMd: "10px",
        vaultLg: "12px",
        vaultXl: "16px",
        vaultPill: "999px",
      },
      boxShadow: {
        vaultCard: "0 1px 2px rgba(17, 24, 39, 0.03)",
        vaultButton: "0 6px 16px rgba(16, 33, 59, 0.16)",
        vaultDialog: "0 20px 48px rgba(31, 41, 55, 0.12)",
        vaultWindow: "0 20px 50px rgba(31, 41, 55, 0.08)",
      },
      fontSize: {
        "11": ["11px", "18px"],
        "12": ["12px", "18px"],
        "13": ["13px", "20px"],
        "14": ["14px", "22px"],
        "16": ["16px", "24px"],
        "22": ["22px", "30px"],
      },
      animation: {
        "fade-in": "fadeIn 0.18s ease-out",
        "slide-up": "slideUp 0.18s ease-out",
        "scale-in": "scaleIn 0.18s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
