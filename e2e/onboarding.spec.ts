import { test, expect } from "@playwright/test";

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

test.describe("Phase 3: Business & Branch Onboarding Flow", () => {
  test("Fresh user sees onboarding CTA, completes wizard, and accesses new active tenant", async ({
    page,
  }) => {
    const blockedMembershipCookies: string[] = [];
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    cdp.on("Network.responseReceivedExtraInfo", (event) => {
      for (const blocked of event.blockedCookies ?? []) {
        if (blocked.cookieLine.startsWith("darb_rest_dynamic_memberships="))
          blockedMembershipCookies.push(...blocked.blockedReasons);
      }
    });
    // 1. Authenticate as fresh user without businesses
    await page.goto(
      "http://localhost:3001/auth/dev-login?email=newuser%40darb.co.il&redirectUrl=/ar",
    );

    // Verify empty state with CTA
    await expect(page.locator("body")).toContainText("لا يوجد نشاط تجاري مرتبط بهذا الحساب");
    const createBtn = page.getByRole("button", { name: "تسجيل نشاط تجاري جديد" });
    await expect(createBtn).toBeVisible();

    // 2. Click CTA to enter onboarding
    await createBtn.click();
    await expect(page).toHaveURL(/.*\/ar\/onboarding/);

    // Verify HTML direction and lang
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "ar");

    // Verify Stepper displays step 1
    await expect(page.locator("nav[aria-label='Progress']")).toBeVisible();
    await expect(page.locator("body")).toContainText("الهوية");

    // 3. Step 1 Validation: empty input should trigger error on Next
    const nextBtn = page.getByRole("button", { name: "التالي" });
    await nextBtn.click();
    await expect(page.locator("body")).toContainText("يجب إدخال اسم النشاط بلغة واحدة على الأقل");

    // 4. Fill Business Name and test slug suggestion
    const nameInput = page.locator("input[placeholder='مثال: درب بيسترو']");
    await nameInput.fill("مقهى الكرمل الحديث");

    // Set valid slug
    const slugInput = page.locator("input[placeholder='darb-bistro']");
    await slugInput.fill("carmel-cafe");

    // Advance to Step 2
    await nextBtn.click();
    await expect(page.locator("body")).toContainText("النوع واللغة");

    // 5. Verify minimal draft cookie (NO business data in cookie)
    let draftCookie: { name: string; value: string } | undefined;
    await expect
      .poll(
        async () => {
          const cookies = await page.context().cookies();
          draftCookie = cookies.find((c) => c.name === "darb_rest_onboarding_draft");
          return draftCookie;
        },
        { timeout: 5000 },
      )
      .toBeDefined();

    if (draftCookie) {
      const parsed = JSON.parse(decodeURIComponent((draftCookie as { value: string }).value));
      expect(parsed).toHaveProperty("draftId");
      expect(parsed).toHaveProperty("currentStep", 2);
      expect(parsed).not.toHaveProperty("businessName");
      expect(parsed).not.toHaveProperty("businessSlug");
      expect(parsed).not.toHaveProperty("carmel-cafe");
    }

    // 6. Test Cross-Device / Fresh Session Resumption
    // Clear only client draft cookie to simulate accessing from a new device/browser
    await page.context().clearCookies({ name: "darb_rest_onboarding_draft" });
    await page.reload();

    // Verify Resume Setup banner appears from server-persisted draft
    await expect(page.locator("body")).toContainText("لديك إعداد غير مكتمل");
    const resumeBtn = page.getByRole("button", { name: "استئناف الإعداد" });
    await expect(resumeBtn).toBeVisible();
    await resumeBtn.click();

    // 7. Step 2: Type & Locale
    await expect(page.locator("body")).toContainText("النوع واللغة");
    // Select Café card
    const cafeCard = page.locator("text=مقهى ومحمصة");
    await cafeCard.click();
    await nextBtn.click();

    // 6. Step 3: Contact & Branding
    await expect(page.locator("body")).toContainText("التواصل");
    const phoneInput = page.locator("input[placeholder='+972 50 000 0000']");
    await phoneInput.fill("+972501234567");
    await nextBtn.click();

    // 7. Step 4: First Branch
    await expect(page.locator("body")).toContainText("إعداد الفرع الأول");
    const branchNameInput = page.locator("input[placeholder='مثال: الفرع الرئيسي']");
    await branchNameInput.fill("فرع الكرمل");
    const addressInput = page.locator("input[placeholder='مثال: شارع الميناء 12']");
    await addressInput.fill("شارع موريا 15");
    const cityInput = page.locator("input[placeholder='مثال: حيفا']");
    await cityInput.fill("حيفا");
    await nextBtn.click();

    // 8. Step 5: Opening Hours
    await expect(page.locator("body")).toContainText("ساعات العمل الأسبوعية");
    await expect(page.locator("body")).toContainText("الإثنين");
    await expect(page.locator("body")).toContainText("الجمعة");
    await nextBtn.click();

    // 9. Step 6: Plan Selection
    await expect(page.locator("body")).toContainText("اختر الباقة التجارية");
    await expect(page.locator("body")).toContainText("الباقة الاحترافية");
    await nextBtn.click();

    // 10. Step 7: Review & Confirm
    await expect(page.locator("body")).toContainText("مراجعة بيانات النشاط");
    await expect(page.locator("body")).toContainText("مقهى الكرمل الحديث");
    await expect(page.locator("body")).toContainText("carmel-cafe");

    // Click Create Business & Launch
    const submitBtn = page.getByRole("button", { name: "إنشاء النشاط التجاري والإطلاق" });
    await submitBtn.click();

    // 11. Post-Onboarding: automatically refreshes into dashboard with new active tenant
    await expect(page).toHaveURL(/.*\/ar$/, { timeout: 10000 });
    await expect(page.locator("body")).toContainText("مقهى الكرمل الحديث");
    await expect(page.locator("body")).toContainText("carmel-cafe");

    // Verify zero emojis on newly rendered dashboard
    const dashboardText = (await page.textContent("body")) || "";
    expect(EMOJI_REGEX.test(dashboardText)).toBe(false);

    expect(blockedMembershipCookies).toEqual([]);
    const stored = (await page.context().cookies()).find(
      (c) => c.name === "darb_rest_dynamic_memberships",
    );
    expect(stored).toBeDefined();
    expect(Buffer.byteLength(stored!.value)).toBeLessThan(4096);

    // 12. Navigate to Locations page
    await page.goto("http://localhost:3001/ar/locations");
    await expect(page).toHaveURL(/.*\/ar\/locations/);
    await expect(page.locator("body")).toContainText("الفروع والمواقع");
    await expect(page.locator("body")).toContainText("فرع الكرمل");
    await expect(page.locator("body")).toContainText("شارع موريا 15");

    // Verify zero emojis on Locations page
    const locText = (await page.textContent("body")) || "";
    expect(EMOJI_REGEX.test(locText)).toBe(false);

    // 13. Navigate to Business Settings page
    await page.goto("http://localhost:3001/ar/settings");
    await expect(page).toHaveURL(/.*\/ar\/settings/);
    await expect(page.locator("body")).toContainText("إعدادات النشاط التجاري");
    await expect(page.locator("body")).toContainText("carmel-cafe");

    // Verify zero emojis on Settings page
    const settingsText = (await page.textContent("body")) || "";
    expect(EMOJI_REGEX.test(settingsText)).toBe(false);
  });
});
