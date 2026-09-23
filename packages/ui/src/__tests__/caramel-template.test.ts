import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  type ContentData,
  type AppearanceSettings,
  type RestaurantProfile,
  DEFAULT_APPEARANCE,
} from "@darb-rest/types";
import { RESTAURANT_TEMPLATES, restaurantTemplate } from "../restaurant/registry";
import { CaramelMenu } from "../restaurant/caramel";
import { WhatsappMenu } from "../whatsapp-menu";

const sampleProfile: RestaurantProfile = {
  timezone: "Asia/Jerusalem",
  address: "Al-Bahr Street 12, Maghar",
  phone: "+972501234567",
  website: "https://example.com",
  instagram: "https://instagram.com/example",
  facebook: "https://facebook.com/example",
  hours: [
    { day_of_week: 1, open_time: "09:00", close_time: "22:00", is_closed: false },
    { day_of_week: 2, open_time: "09:00", close_time: "22:00", is_closed: false },
    { day_of_week: 3, open_time: "09:00", close_time: "22:00", is_closed: false },
    { day_of_week: 4, open_time: "09:00", close_time: "22:00", is_closed: false },
    { day_of_week: 5, open_time: "09:00", close_time: "23:00", is_closed: false },
    { day_of_week: 6, open_time: "10:00", close_time: "23:00", is_closed: false },
    { day_of_week: 7, open_time: "10:00", close_time: "20:00", is_closed: false },
  ],
};

const sampleData = {
  menus: [{ id: "m1", status: "active", is_default: true, sort_order: 0, name_i18n: { en: "Main Menu", ar: "القائمة الرئيسية", he: "תפריט ראשי" } }],
  menu_locations: [{ menu_id: "m1", location_id: "loc1", is_enabled: true }],
  menu_sections: [
    {
      id: "sec1",
      menu_id: "m1",
      sort_order: 0,
      is_visible: true,
      name_i18n: { en: "Pastries", ar: "معجنات", he: "מאפים" },
      description_i18n: { en: "Freshly baked daily", ar: "طازج يومياً", he: "נאפה טרי מדי יום" },
    },
    {
      id: "sec2",
      menu_id: "m1",
      sort_order: 1,
      is_visible: true,
      name_i18n: { en: "Coffee & Tea", ar: "قهوة وشاي", he: "קפה ותה" },
      description_i18n: { en: "Artisan roasted brews", ar: "حبوب مختارة ومحمصة", he: "קלייה מובחרת" },
    },
  ],
  menu_items: [
    {
      id: "item1",
      section_id: "sec1",
      sort_order: 0,
      base_price: 28,
      currency: "ILS",
      is_visible: true,
      is_available: true,
      name_i18n: { en: "Caramel Brioche", ar: "بريوش الكراميل", he: "בריוש קרמל" },
      description_i18n: { en: "Warm spiced caramel glaze", ar: "صوص كراميل دافئ", he: "זיגוג קרמל חם" },
      image_path: "items/item1.webp",
    },
    {
      id: "item2",
      section_id: "sec2",
      sort_order: 0,
      base_price: 16,
      currency: "ILS",
      is_visible: true,
      is_available: true,
      name_i18n: { en: "Pistachio Latte", ar: "لاتيه الفستق", he: "לאטה פיסטוק" },
      description_i18n: { en: "Double shot espresso with pistachio cream", ar: "إسبريسو مع كريمة الفستق", he: "אספרסו כפול עם קרם פיסטוק" },
      image_path: null,
    },
  ],
  item_variants: [],
  modifier_groups: [],
  item_modifier_groups: [],
  modifiers: [],
  item_dietary_tags: [],
  item_allergens: [],
  menu_item_location_overrides: [],
} as unknown as ContentData;

const sampleSettings: AppearanceSettings = {
  ...DEFAULT_APPEARANCE,
  template: "caramel",
  primary: "#f07a12",
  accent: "#ffc44d",
};

describe("Caramel Template #9", () => {
  it("is registered in RESTAURANT_TEMPLATES with correct ID and className", () => {
    const t = restaurantTemplate("caramel");
    expect(t.id).toBe("caramel");
    expect(t.className).toBe("rt-caramel");
    expect(typeof t.Hero).toBe("function");
    expect(RESTAURANT_TEMPLATES.some((tmpl) => tmpl.id === "caramel")).toBe(true);
  });

  it("renders CaramelMenu server HTML cleanly in English", () => {
    const html = renderToString(
      React.createElement(CaramelMenu, {
        data: sampleData,
        locale: "en",
        business: { name: { en: "Caramel Café", ar: "مقهى كاراميل", he: "קפה קרמל" } },
        locations: [{ id: "loc1", name: { en: "Main Branch", ar: "الفرع الرئيسي", he: "סניף ראשי" } }],
        images: { "items/item1.webp": "https://cdn.example.com/item1.webp" },
        labels: {
          sections: "Categories",
          title: "Menu",
          from: "From",
          soldOut: "Sold out",
          add: "Add",
          close: "Close",
          allergens: "Allergens",
          previousDish: "Previous dish",
          nextDish: "Next dish",
          scrollAndDiscover: "Scroll & discover",
          today: "Today",
          waze: "Directions via Waze",
          story: "Our story",
        },
        restaurant: {
          settings: sampleSettings,
          profile: sampleProfile,
          labels: {
            open: "Open now",
            closed: "Closed now",
            hoursUnknown: "Hours not provided",
            restaurant: "Restaurant & menu",
            visit: "Plan your visit",
            hours: "Opening hours",
            location: "Location",
            directions: "Get directions",
            waze: "Directions via Waze",
            website: "Website",
            instagram: "Instagram",
            facebook: "Facebook",
            story: "Our story",
          },
        },
      }),
    );

    // Structure assertions
    expect(html).toContain("rt-caramel");
    expect(html).toContain("Caramel Café");
    expect(html).toContain("Caramel Brioche");
    expect(html).toContain("Pistachio Latte");
    expect(html).toContain("Pastries");
    expect(html).toContain("Coffee &amp; Tea");
    expect(html).toContain("caramel-dish-rail");
    expect(html).toContain("caramel-category-nav");
    expect(html).toContain("caramel-identity-seam");
    expect(html).toContain("Al-Bahr Street 12, Maghar");
  });

  it("renders CaramelMenu server HTML in Arabic and Hebrew with RTL support", () => {
    const htmlAr = renderToString(
      React.createElement(CaramelMenu, {
        data: sampleData,
        locale: "ar",
        business: { name: { en: "Caramel Café", ar: "مقهى كاراميل", he: "קפה קרמל" } },
        locations: [{ id: "loc1", name: { en: "Main Branch", ar: "الفرع الرئيسي", he: "סניף ראשי" } }],
        images: {},
        labels: {
          sections: "الفئات",
          title: "المنيو",
          from: "ابتداءً من",
          soldOut: "غير متوفر",
          add: "إضافة",
          previousDish: "الطبق السابق",
          nextDish: "الطبق التالي",
          scrollAndDiscover: "تصفح واكتشف",
        },
        restaurant: {
          settings: sampleSettings,
          profile: sampleProfile,
          labels: {
            open: "مفتوح الآن",
            closed: "مغلق الآن",
            restaurant: "المطعم والقائمة",
          },
        },
      }),
    );

    expect(htmlAr).toContain("مقهى كاراميل");
    expect(htmlAr).toContain("بريوش الكراميل");
    expect(htmlAr).toContain("معجنات");

    const htmlHe = renderToString(
      React.createElement(CaramelMenu, {
        data: sampleData,
        locale: "he",
        business: { name: { en: "Caramel Café", ar: "مقهى كاراميل", he: "קפה קרמל" } },
        locations: [{ id: "loc1", name: { en: "Main Branch", ar: "الفرع الرئيسي", he: "סניף ראשי" } }],
        images: {},
        labels: {
          sections: "קטגוריות",
          title: "תפריט",
          from: "החל מ-",
          soldOut: "לא זמין כרגע",
          add: "הוספה",
          previousDish: "מנה קודמת",
          nextDish: "מנה הבאה",
          scrollAndDiscover: "גללו וגלו",
        },
        restaurant: {
          settings: sampleSettings,
          profile: sampleProfile,
          labels: {
            open: "פתוח עכשיו",
            closed: "סגור עכשיו",
            restaurant: "תפריט המסעדה",
          },
        },
      }),
    );

    expect(htmlHe).toContain("קפה קרמל");
    expect(htmlHe).toContain("בריוש קרמל");
    expect(htmlHe).toContain("מאפים");
  });

  it("strictly prohibits raw emoji characters in the template rendered output", () => {
    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

    const html = renderToString(
      React.createElement(CaramelMenu, {
        data: sampleData,
        locale: "he",
        business: { name: { en: "Caramel Café", ar: "مقهى كاراميل", he: "קפה קרמל" } },
        locations: [{ id: "loc1", name: { en: "Main Branch", ar: "الفرع الرئيسي", he: "סניף ראשי" } }],
        images: {},
        labels: {
          sections: "קטגוריות",
          title: "תפריט",
          from: "החל מ-",
          soldOut: "לא זמין",
          add: "הוספה",
          previousDish: "מנה קודמת",
          nextDish: "מנה הבאה",
          scrollAndDiscover: "גללו וגלו",
        },
        restaurant: {
          settings: sampleSettings,
          profile: sampleProfile,
          labels: {
            open: "פתוח עכשיו",
            closed: "סגור עכשיו",
            hoursUnknown: "שעות לא ידועות",
            restaurant: "מסעדה",
            visit: "ביקור",
            hours: "שעות",
            location: "מיקום",
            directions: "הוראות הגעה",
            waze: "ניווט ב-Waze",
            website: "אתר",
            instagram: "אינסטגרם",
            facebook: "פייסבוק",
          },
        },
      }),
    );

    expect(emojiRegex.test(html)).toBe(false);
  });

  it("adapts commerce controls based on Basic vs Pro plan capabilities", () => {
    // Basic plan: onConfigure is undefined
    const htmlBasic = renderToString(
      React.createElement(CaramelMenu, {
        data: sampleData,
        locale: "en",
        business: { name: { en: "Caramel Café", ar: "مقهى كاراميل", he: "קפה קרמל" } },
        locations: [{ id: "loc1", name: { en: "Main Branch", ar: "الفرع الرئيسي", he: "סניף ראשי" } }],
        images: {},
        labels: { sections: "Categories", title: "Menu", add: "Add to cart" },
        restaurant: {
          settings: sampleSettings,
          profile: sampleProfile,
          labels: { open: "Open now", closed: "Closed now" },
        },
      }),
    );

    // No add buttons on dish cards in Basic mode
    expect(htmlBasic).not.toContain("caramel-card-add-btn");

    // Pro plan: onConfigure is provided
    const htmlPro = renderToString(
      React.createElement(CaramelMenu, {
        data: sampleData,
        locale: "en",
        business: { name: { en: "Caramel Café", ar: "مقهى كاراميل", he: "קפה קרמל" } },
        locations: [{ id: "loc1", name: { en: "Main Branch", ar: "الفرع الرئيسي", he: "סניף ראשי" } }],
        images: {},
        labels: { sections: "Categories", title: "Menu", add: "Add to cart" },
        onConfigure: () => {},
        addLabel: "Add to cart",
        restaurant: {
          settings: sampleSettings,
          profile: sampleProfile,
          labels: { open: "Open now", closed: "Closed now" },
        },
      }),
    );

    // Add button is rendered on available dish cards in Pro mode
    expect(htmlPro).toContain("caramel-card-add-btn");
    expect(htmlPro).toContain("Add to cart");
  });

  it("integrates seamlessly into WhatsappMenu with capability context", () => {
    // Pro capability: access.cart = true
    const htmlWhatsappPro = renderToString(
      React.createElement(WhatsappMenu, {
        restaurant: {
          settings: sampleSettings,
          profile: sampleProfile,
          labels: { open: "Open now", closed: "Closed now" },
        },
        access: { cart: true, reservation: false },
        scope: "test-cart:b1:loc1",
        prepare: async () => ({}),
        L: { cart: "Your Cart", add: "Add", request: "Reserve", close: "Close" },
        data: sampleData,
        business: { name: { en: "Caramel Café", ar: "مقهى كاراميل", he: "קפה קרמל" } },
        locations: [{ id: "loc1", name: { en: "Main Branch", ar: "الفرع الرئيسي", he: "סניף ראשי" } }],
        images: {},
        locale: "en",
        labels: { sections: "Categories", title: "Menu" },
      }),
    );

    expect(htmlWhatsappPro).toContain('data-template="caramel"');
    expect(htmlWhatsappPro).toContain("caramel-flow");
    expect(htmlWhatsappPro).toContain("caramel-dish-rail");
    expect(htmlWhatsappPro).toContain("Your Cart");

    // Plus capability: access.reservation = true
    const htmlWhatsappPlus = renderToString(
      React.createElement(WhatsappMenu, {
        restaurant: {
          settings: sampleSettings,
          profile: sampleProfile,
          labels: { open: "Open now", closed: "Closed now" },
        },
        access: { cart: false, reservation: true },
        scope: "test-cart:b1:loc1",
        prepare: async () => ({}),
        L: { cart: "Your Cart", add: "Add", request: "Request Reservation", close: "Close" },
        data: sampleData,
        business: { name: { en: "Caramel Café", ar: "مقهى كاراميل", he: "קפה קרמל" } },
        locations: [{ id: "loc1", name: { en: "Main Branch", ar: "الفرع الرئيسي", he: "סניף ראשי" } }],
        images: {},
        locale: "en",
        labels: { sections: "Categories", title: "Menu" },
      }),
    );

    expect(htmlWhatsappPlus).toContain('data-template="caramel"');
    expect(htmlWhatsappPlus).toContain("caramel-flow");
    expect(htmlWhatsappPlus).toContain("Request Reservation");
    expect(htmlWhatsappPlus).not.toContain("Your Cart");
  });

  it("handles complex populated fixture data with multiple menus, branches, and unavailable items", () => {
    const complexData = {
      menus: [
        { id: "m1", status: "active", is_default: true, sort_order: 0, name_i18n: { en: "Morning Pastries", ar: "معجنات الصباح", he: "מאפי בוקר" } },
        { id: "m2", status: "active", is_default: false, sort_order: 1, name_i18n: { en: "Afternoon Delights", ar: "حلويات المساء", he: "קינוחי ערב" } },
      ],
      menu_locations: [
        { menu_id: "m1", location_id: "loc1", is_enabled: true },
        { menu_id: "m2", location_id: "loc1", is_enabled: true },
      ],
      menu_sections: [
        {
          id: "sec1",
          menu_id: "m1",
          sort_order: 0,
          is_visible: true,
          name_i18n: { en: "Signature Bakes & Artisan Tarts", ar: "مخبوزات التوقيع وتارتات حرفية", he: "מאפי הבית וטארטים מיוחדים" },
          description_i18n: { en: "Crafted with pure butter and Madagascar vanilla bean glaze", ar: "مصنوعة بزبدة نقية وفانيليا مدغשקר", he: "עשוי עם חמאה טהורה ומקלות וניל ממדגסקר" },
        },
        {
          id: "sec2",
          menu_id: "m1",
          sort_order: 1,
          is_visible: true,
          name_i18n: { en: "Tea", ar: "شاي", he: "תה" },
          description_i18n: null,
        },
      ],
      menu_items: [
        {
          id: "item_avail",
          section_id: "sec1",
          sort_order: 0,
          base_price: 34,
          currency: "ILS",
          is_visible: true,
          is_available: true,
          name_i18n: { en: "Pecan Caramel Crunch Tart with Spiced Cream", ar: "تارت كراميل بالبيكان مع كريمة متبلة", he: "טארט קרמל פקאן פריך עם קרם מתובל" },
          description_i18n: { en: "Multi-layered flaky crust filled with roasted pecans and house-made salted caramel", ar: "عجينة هشة متعددة الطبقات مع بيكان محمص وكراميل مملح منزلي", he: "בצק פריך רב-שכבתי במילוי פקאנים קלויים וקרמל מלוח בעבודת יד" },
          image_path: "items/pecan.webp",
        },
        {
          id: "item_soldout",
          section_id: "sec1",
          sort_order: 1,
          base_price: 42,
          currency: "ILS",
          is_visible: true,
          is_available: false,
          name_i18n: { en: "Pistachio Croissant", ar: "كرواسون الفستق", he: "קרואסון פיסטוק" },
          description_i18n: null,
          image_path: null,
        },
      ],
      item_variants: [
        { id: "v1", item_id: "item_avail", name_i18n: { en: "Small", ar: "صغير", he: "קטן" }, price_override: 34, sort_order: 0 },
        { id: "v2", item_id: "item_avail", name_i18n: { en: "Large", ar: "كبير", he: "גדול" }, price_override: 58, sort_order: 1 },
      ],
      modifier_groups: [],
      item_modifier_groups: [],
      modifiers: [],
      item_dietary_tags: [],
      item_allergens: [],
      menu_item_location_overrides: [],
    } as unknown as ContentData;

    const longRestaurantProfile: RestaurantProfile = {
      ...sampleProfile,
      hours: [
        { day_of_week: 1, open_time: "07:30", close_time: "23:00", is_closed: false },
        { day_of_week: 2, open_time: "07:30", close_time: "23:00", is_closed: false },
        { day_of_week: 3, open_time: "07:30", close_time: "23:00", is_closed: false },
        { day_of_week: 4, open_time: "07:30", close_time: "23:00", is_closed: false },
        { day_of_week: 5, open_time: "07:30", close_time: "00:00", is_closed: false },
        { day_of_week: 6, open_time: "08:00", close_time: "00:00", is_closed: false },
        { day_of_week: 7, open_time: "08:00", close_time: "22:00", is_closed: false },
      ],
    };

    const html = renderToString(
      React.createElement(CaramelMenu, {
        data: complexData,
        locale: "en",
        business: {
          name: {
            en: "Caramel Atelier Bakery & Specialty Coffee Roasters",
            ar: "كاراميل أتيليه بيكري ومحمص قهوة مختصة",
            he: "קרמל אטלייה מאפייה ובית קלייה למומחים",
          },
        },
        locations: [
          { id: "loc1", name: { en: "Galilee Promenade Flagship", ar: "فرع الممشى الرئيسي", he: "סניף הדגל בטיילת הגליל" } },
          { id: "loc2", name: { en: "Old City Boutique", ar: "بوتيك البلدة القديمة", he: "בוטיק העיר העתיקה" } },
        ],
        images: { "items/pecan.webp": "https://cdn.example.com/pecan.webp" },
        labels: {
          sections: "Categories",
          title: "Menus",
          from: "From",
          soldOut: "Sold out",
          add: "Add",
          close: "Close",
          allergens: "Allergens",
          previousDish: "Previous",
          nextDish: "Next",
          scrollAndDiscover: "Scroll & discover",
          today: "Today",
          waze: "Waze navigation",
          story: "Our story",
        },
        restaurant: {
          settings: sampleSettings,
          profile: longRestaurantProfile,
          labels: {
            open: "Open",
            closed: "Closed",
            hoursUnknown: "Hours unknown",
            restaurant: "Restaurant",
            visit: "Visit us",
            hours: "Hours",
            location: "Location",
            directions: "Directions",
            waze: "Waze navigation",
            website: "Website",
            instagram: "Instagram",
            facebook: "Facebook",
          },
        },
      }),
    );

    // Multi-menu switch presence
    expect(html).toContain("rt-menu-switch");
    expect(html).toContain("Morning Pastries");
    expect(html).toContain("Afternoon Delights");

    // Long restaurant title
    expect(html).toContain("Caramel Atelier Bakery &amp; Specialty Coffee Roasters");

    // Both sections and items
    expect(html).toContain("Signature Bakes &amp; Artisan Tarts");
    expect(html).toContain("Pecan Caramel Crunch Tart with Spiced Cream");
    expect(html).toContain("Pistachio Croissant");

    // Sold out indicator on unavailable item
    expect(html).toContain("caramel-card-unavailable");
    expect(html).toContain("Sold out");

    // Category subtitle support
    expect(html).toContain("caramel-category-subtitle");
    expect(html).toContain("Crafted with pure butter and Madagascar vanilla bean glaze");

    // Fallback image rendering for item without image
    expect(html).toContain("caramel-card-img-wrap");

    // 7-day hours rendering
    expect(html).toContain("caramel-hours-list");
    expect(html).toContain("07:30–23:00");
  });
});
