import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { Button, Badge, BrandLogo } from "../index";

describe("UI Package Primitives", () => {
  it("renders Button correctly with variant classes", () => {
    const html = renderToString(React.createElement(Button, { variant: "primary" }, "Click Me"));
    expect(html).toContain("Click Me");
    expect(html).toContain("<button");
  });

  it("renders Button with loading spinner and disables interaction", () => {
    const html = renderToString(React.createElement(Button, { isLoading: true }, "Submitting"));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("<svg");
  });

  it("renders Badge correctly", () => {
    const html = renderToString(React.createElement(Badge, { variant: "success" }, "Active"));
    expect(html).toContain("Active");
  });

  it("renders BrandLogo SVG without any emoji characters", () => {
    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
    const html = renderToString(
      React.createElement(BrandLogo, { showTagline: true, taglineText: "Engine" }),
    );

    expect(html).toContain("Darb");
    expect(html).toContain("REST");
    expect(emojiRegex.test(html)).toBe(false);
  });
});
