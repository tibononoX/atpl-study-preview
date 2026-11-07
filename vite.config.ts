import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: "/atpl-study-preview/",
  plugins: [react()],
  test: { environment: "jsdom", globals: true, restoreMocks: true },
});
