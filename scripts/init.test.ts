import {
  mkdirSync,
  writeFileSync as fsWrite,
  existsSync,
  rmSync as fsRm,
} from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  removeMarkerBlocks,
  replaceScope,
  uncommentMarkerBlock,
  removeFiles,
  removeDirs,
  removeDocker,
  updateDomain,
  updateProjectName,
} from "./init";

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

describe("removeFiles", () => {
  const tmpDir = join(import.meta.dir, ".test-tmp");

  test("removes listed files", () => {
    mkdirSync(tmpDir, { recursive: true });
    const f1 = join(tmpDir, "a.ts");
    const f2 = join(tmpDir, "b.ts");
    fsWrite(f1, "content");
    fsWrite(f2, "content");

    removeFiles([f1, f2]);
    expect(existsSync(f1)).toBe(false);
    expect(existsSync(f2)).toBe(false);

    fsRm(tmpDir, { recursive: true, force: true });
  });

  test("skips non-existent files without error", () => {
    expect(() => removeFiles(["/nonexistent/file.ts"])).not.toThrow();
  });
});

describe("removeDirs", () => {
  const tmpDir = join(import.meta.dir, ".test-tmp-dirs");

  test("removes listed directories recursively", () => {
    const subDir = join(tmpDir, "sub");
    mkdirSync(subDir, { recursive: true });
    fsWrite(join(subDir, "file.ts"), "content");

    removeDirs([tmpDir]);
    expect(existsSync(tmpDir)).toBe(false);
  });
});

describe("removeDocker", () => {
  const tmpDir = join(import.meta.dir, ".test-docker");

  test("removes docker-related files and dirs", () => {
    mkdirSync(join(tmpDir, "deployments"), { recursive: true });
    fsWrite(join(tmpDir, "Dockerfile.frontend"), "FROM node");
    fsWrite(join(tmpDir, "Dockerfile.server"), "FROM node");
    fsWrite(join(tmpDir, "railway.json"), "{}");
    fsWrite(join(tmpDir, ".dockerignore"), "*");
    fsWrite(join(tmpDir, "deployments/nginx.conf"), "server {}");

    removeDocker(tmpDir);

    expect(existsSync(join(tmpDir, "Dockerfile.frontend"))).toBe(false);
    expect(existsSync(join(tmpDir, "Dockerfile.server"))).toBe(false);
    expect(existsSync(join(tmpDir, "railway.json"))).toBe(false);
    expect(existsSync(join(tmpDir, ".dockerignore"))).toBe(false);
    expect(existsSync(join(tmpDir, "deployments"))).toBe(false);

    fsRm(tmpDir, { recursive: true, force: true });
  });
});

describe("updateDomain", () => {
  const tmpDir = join(import.meta.dir, ".test-domain");

  test("replaces domain in server/app.ts", () => {
    mkdirSync(join(tmpDir, "server"), { recursive: true });
    fsWrite(
      join(tmpDir, "server/app.ts"),
      `if (origin.endsWith('.sandilya.dev')) {`,
    );

    updateDomain(tmpDir, "myapp.dev");

    const content = require("fs").readFileSync(
      join(tmpDir, "server/app.ts"),
      "utf-8",
    );
    expect(content).toContain(".myapp.dev");
    expect(content).not.toContain(".sandilya.dev");

    fsRm(tmpDir, { recursive: true, force: true });
  });

  test("replaces domain in frontend/index.html", () => {
    mkdirSync(join(tmpDir, "frontend"), { recursive: true });
    fsWrite(
      join(tmpDir, "frontend/index.html"),
      `<meta property="og:url" content="https://sandilya.dev" />
<meta property="twitter:domain" content="sandilya.dev" />`,
    );

    updateDomain(tmpDir, "cool.app");

    const content = require("fs").readFileSync(
      join(tmpDir, "frontend/index.html"),
      "utf-8",
    );
    expect(content).toContain("cool.app");
    expect(content).not.toContain("sandilya.dev");

    fsRm(tmpDir, { recursive: true, force: true });
  });
});
