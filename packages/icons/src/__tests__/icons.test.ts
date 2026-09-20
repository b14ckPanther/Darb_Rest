import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  IconRestaurant,
  IconCafe,
  IconMenu,
  IconQrCode,
  ArrowStart,
  ArrowEnd,
  ChevronStart,
  ChevronEnd,
} from "../index";

describe("Icons Package", () => {
  it("renders SVG elements with proper SVG tags", () => {
    const restaurantHtml = renderToString(React.createElement(IconRestaurant));
    expect(restaurantHtml).toContain("<svg");
    expect(restaurantHtml).toContain('aria-hidden="true"');

    const cafeHtml = renderToString(React.createElement(IconCafe));
    expect(cafeHtml).toContain("<svg");

    const qrHtml = renderToString(React.createElement(IconQrCode));
    expect(qrHtml).toContain("<svg");
  });

  it("directional icons render without errors in RTL and LTR", () => {
    const arrowLtr = renderToString(React.createElement(ArrowStart, { direction: "ltr" }));
    const arrowRtl = renderToString(React.createElement(ArrowStart, { direction: "rtl" }));

    expect(arrowLtr).toContain("<svg");
    expect(arrowRtl).toContain("<svg");

    const chevronLtr = renderToString(React.createElement(ChevronEnd, { direction: "ltr" }));
    const chevronRtl = renderToString(React.createElement(ChevronEnd, { direction: "rtl" }));

    expect(chevronLtr).toContain("<svg");
    expect(chevronRtl).toContain("<svg");
  });

  it("strictly prohibits emojis in icon rendering output", () => {
    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

    const components = [
      IconRestaurant,
      IconCafe,
      IconMenu,
      IconQrCode,
      ArrowStart,
      ArrowEnd,
      ChevronStart,
      ChevronEnd,
    ];
    for (const Comp of components) {
      const html = renderToString(React.createElement(Comp));
      expect(emojiRegex.test(html)).toBe(false);
    }
  });
});
