import { describe, expect, test } from "bun:test";
import { removeMarkerBlocks, replaceScope, uncommentMarkerBlock } from "./init";

describe("removeMarkerBlocks", () => {
  test("removes content between markers inclusive", () => {
    const input = `line1
// @init:firebase-start
firebase code
// @init:firebase-end
line2`;
    const result = removeMarkerBlocks(input, "firebase");
    expect(result).toBe("line1\nline2");
  });

  test("removes JSX comment markers", () => {
    const input = `<StrictMode>
    {/* @init:firebase-start */}
    <AuthProvider>
    {/* @init:firebase-end */}
      <App />
    {/* @init:firebase-start */}
    </AuthProvider>
    {/* @init:firebase-end */}
</StrictMode>`;
    const result = removeMarkerBlocks(input, "firebase");
    expect(result).toBe(`<StrictMode>
      <App />
</StrictMode>`);
  });

  test("handles multiple blocks of same feature", () => {
    const input = `a
// @init:firebase-start
b
// @init:firebase-end
c
// @init:firebase-start
d
// @init:firebase-end
e`;
    const result = removeMarkerBlocks(input, "firebase");
    expect(result).toBe("a\nc\ne");
  });

  test("returns unchanged if no markers found", () => {
    const input = "no markers here";
    const result = removeMarkerBlocks(input, "firebase");
    expect(result).toBe("no markers here");
  });
});

describe("replaceScope", () => {
  test("replaces all occurrences of scope", () => {
    const input = `import { foo } from '@sandilya-stack/shared/types';
import { bar } from '@sandilya-stack/shared/config/eslint';`;
    const result = replaceScope(input, "@sandilya-stack", "@my-app");
    expect(result).toBe(`import { foo } from '@my-app/shared/types';
import { bar } from '@my-app/shared/config/eslint';`);
  });

  test("replaces in JSON content", () => {
    const input = `"name": "@sandilya-stack/frontend"`;
    const result = replaceScope(input, "@sandilya-stack", "@cool-app");
    expect(result).toBe(`"name": "@cool-app/frontend"`);
  });
});

describe("uncommentMarkerBlock", () => {
  test("uncomments lines within marker block", () => {
    const input = `// @init:no-firebase-start
// const client = hc<ApiRoutes>(baseUrl);
// @init:no-firebase-end`;
    const result = uncommentMarkerBlock(input, "no-firebase");
    expect(result).toBe("const client = hc<ApiRoutes>(baseUrl);\n");
  });
});
