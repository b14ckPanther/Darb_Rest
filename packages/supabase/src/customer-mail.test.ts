import { afterEach, describe, expect, it, vi } from "vitest";
import { mailDocument, transactionalProvider } from "./customer-mail";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("transactional email boundary", () => {
  it("does not invent delivery without a configured provider", () => {
    vi.stubEnv("TRANSACTIONAL_EMAIL_ENDPOINT", "");
    expect(transactionalProvider()).toBeNull();
  });
  it("escapes applicant content and renders native direction", () => {
    const doc = mailDocument("ar", "<script>", ["<img src=x onerror=alert(1)>"]);
    expect(doc.html).toContain('dir="rtl"');
    expect(doc.html).not.toContain("<script>");
    expect(doc.html).toContain("&lt;img");
  });
  it("requires an acknowledgement id and carries idempotency", async () => {
    vi.stubEnv("TRANSACTIONAL_EMAIL_ENDPOINT", "https://mail.example.test/send");
    vi.stubEnv("TRANSACTIONAL_EMAIL_TOKEN", "test-token");
    vi.stubEnv("TRANSACTIONAL_EMAIL_FROM", "billing@example.test");
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: "test-message" }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    expect(
      await transactionalProvider()!.send(
        { to: "local@example.test", subject: "Test", text: "Test", html: "Test" },
        "stable-key",
      ),
    ).toEqual({ state: "sent", reference: "test-message" });
    expect(fetcher.mock.calls[0]![1].headers["Idempotency-Key"]).toBe("stable-key");
  });
  it("keeps network uncertainty separate from rejection", async () => {
    vi.stubEnv("TRANSACTIONAL_EMAIL_ENDPOINT", "https://mail.example.test/send");
    vi.stubEnv("TRANSACTIONAL_EMAIL_TOKEN", "test-token");
    vi.stubEnv("TRANSACTIONAL_EMAIL_FROM", "billing@example.test");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect(
      await transactionalProvider()!.send(
        { to: "local@example.test", subject: "Test", text: "", html: "" },
        "key",
      ),
    ).toEqual({ state: "unknown" });
  });
});

it("maps the optional Resend adapter without exposing credentials in content", async () => {
  vi.stubEnv("TRANSACTIONAL_EMAIL_PROVIDER", "resend");
  vi.stubEnv("RESEND_API_KEY", "test-only-key");
  vi.stubEnv("TRANSACTIONAL_EMAIL_FROM", "billing@example.test");
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ id: "test-message" }), { status: 200 }));
  vi.stubGlobal("fetch", fetcher);
  await transactionalProvider()!.send(
    {
      to: "customer@example.test",
      senderName: "Darb QA",
      replyTo: "support@example.test",
      subject: "Test",
      text: "Test",
      html: "Test",
    },
    "stable-key",
  );
  expect(String(fetcher.mock.calls[0]![0])).toBe("https://api.resend.com/emails");
  const body = JSON.parse(fetcher.mock.calls[0]![1].body);
  expect(body.from).toBe("Darb QA <billing@example.test>");
  expect(body.reply_to).toBe("support@example.test");
  expect(body).not.toHaveProperty("token");
});
