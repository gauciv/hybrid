import { defineConfig } from "vitest/config";

// Property-based tests run hundreds of generated cases; under parallel load the 5 s default timeout can be hit
// even though each redaction takes < 1 ms (measured). Fail on real counterexamples, not on CPU contention.
export default defineConfig({ test: { testTimeout: 30_000 } });
