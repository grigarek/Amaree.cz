import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./messages/**/*.json"],
  theme: {
    extend: {
      fontFamily: {
        newsreader: ["var(--font-newsreader)", "serif"],
        redhat: ["var(--font-redhat)", "sans-serif"],
        playfair: ["var(--font-playfair)", "serif"],
        montserrat: ["var(--font-montserrat)", "sans-serif"]
      },
      colors: {
        ivory: "#FFFFFF",
        ink: "#171313",
        muted: "#6B6461",
        ruby: "#AF2124",
        rubyDark: "#A71D22",
        blush: "#F7F5F2",
        line: "#E6E2DF"
      },
      boxShadow: {
        soft: "0 24px 70px rgba(23, 19, 19, 0.08)",
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
