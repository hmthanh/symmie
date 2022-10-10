import react from "@vitejs/plugin-react";

export default {
  root: "src",
  build: { outDir: "../dist" },
  publicDir: "fonts",
  plugins: [react()],
};
