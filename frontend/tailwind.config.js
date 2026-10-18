const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { bg: c("bg"), surface: c("surface"), surface2: c("surface2"), line: c("line"), fg: c("fg"), muted: c("muted"), accent: c("accent") } } },
  plugins: [],
};
