import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { Stepper } from "../stepper";

describe("Stepper Component", () => {
  const steps = [
    { id: 1, title: "Identity", description: "Name & Slug" },
    { id: 2, title: "Type", description: "Category" },
    { id: 3, title: "Review", description: "Confirm" },
  ];

  it("renders all steps and marks the current step with aria-current", () => {
    const html = renderToString(React.createElement(Stepper, { steps, currentStep: 2 }));
    expect(html).toContain("Identity");
    expect(html).toContain("Type");
    expect(html).toContain("Review");
    expect(html).toContain('aria-current="step"');
  });

  it("does not contain any emoji characters", () => {
    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
    const html = renderToString(React.createElement(Stepper, { steps, currentStep: 1 }));
    expect(emojiRegex.test(html)).toBe(false);
  });
});
