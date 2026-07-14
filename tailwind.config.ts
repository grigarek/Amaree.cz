import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./messages/**/*.json"],
  theme: {
    extend: {
      fontFamily: {
        newsreader: ["var(--font-newsreader)", "serif"],
        cormorant: ["var(--font-cormorant)", "serif"],
        redhat: ["var(--font-redhat)", "sans-serif"]
      },
      colors: {
        ivory: "#FFFCFA",
        ink: "#171313",
        muted: "#6D6261",
        ruby: "#6F1028",
        rubyDark: "#3C0715",
        blush: "#F6EEF0",
        line: "#E7DEDC"
      },
      boxShadow: {
        soft: "0 24px 70px rgba(60, 7, 21, 0.08)",
        product: "0 18px 45px rgba(23, 19, 19, 0.08)"
      },
      borderRadius: {
        brand: "8px"
      },
      maxWidth: {
        page: "1180px"
      }
    }
  },
  plugins: []
};

export default config;
