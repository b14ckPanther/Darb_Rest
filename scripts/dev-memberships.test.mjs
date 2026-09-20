import test from "node:test";
import assert from "node:assert/strict";
import { encodeDevMemberships, decodeDevMemberships } from "../apps/admin/lib/dev-memberships.ts";
test("development memberships survive serialized Unicode cookies without worker memory", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  try {
    const input = [
      {
        userEmail: "newuser@darb.co.il",
        role: "owner",
        business: { id: "fixture", name: { ar: "مقهى الكرمل الحديث", he: "בית קפה", en: "Café" } },
        locations: Array.from({ length: 10 }, (_, id) => ({
          id,
          name: { ar: "الفرع الرئيسي" },
          operatingHours: Array.from({ length: 7 }, (_, day) => ({
            day,
            open: "08:00",
            close: "22:00",
          })),
        })),
        planEntitlements: [],
        overrides: [],
      },
    ];
    assert.ok(encodeURIComponent(JSON.stringify(input)).length > 4096);
    const cookie = encodeDevMemberships(input);
    assert.ok(Buffer.byteLength(cookie) < 3800);
    assert.deepEqual(decodeDevMemberships(cookie), input);
    assert.deepEqual(decodeDevMemberships(encodeURIComponent(JSON.stringify(input))), input);
    assert.deepEqual(decodeDevMemberships("z1:invalid"), []);
    process.env.NODE_ENV = "production";
    assert.deepEqual(decodeDevMemberships(cookie), []);
    assert.throws(() => encodeDevMemberships(input), /development_only/);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
