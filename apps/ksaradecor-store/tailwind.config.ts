import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        peach: "#e6b8af",
        "peach-light": "#f2d4cc",
        charcoal: "#2d2d2d",
        navy: "#1a2b56",
        teal: "#7bc8d4",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "8px",
      },
    },
  },
  plugins: [],
};
export default config;
