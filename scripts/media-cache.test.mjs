import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { imageDerivative } from "../apps/web/lib/image-derivative-cache.ts";
const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const sharp = require("sharp");
test("authorized derivative reuse avoids original downloads and separates widths and paths", async () => {
  const source = await sharp({
    create: { width: 1000, height: 600, channels: 3, background: "#775533" },
  })
    .png()
    .toBuffer();
  let downloads = 0;
  const load = async () => {
    downloads++;
    return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  };
  const first = await imageDerivative("test/immutable-a", 480, load);
  assert.equal(downloads, 1);
  assert.deepEqual(await imageDerivative("test/immutable-a", 480, load), first);
  assert.equal(downloads, 1);
  assert.equal((await sharp(first).metadata()).width, 480);
  await imageDerivative("test/immutable-a", 960, load);
  await imageDerivative("test/immutable-b", 480, load);
  assert.equal(downloads, 3);
});
test("a failed download is retryable and never cached", async () => {
  let calls = 0;
  const fail = async () => {
    calls++;
    throw Error("missing");
  };
  await assert.rejects(imageDerivative("test/failure", 480, fail));
  await assert.rejects(imageDerivative("test/failure", 480, fail));
  assert.equal(calls, 2);
});
