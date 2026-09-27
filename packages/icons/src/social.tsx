"use client";

import React from "react";
import {
  GithubIcon,
  Globe02Icon,
  InstagramIcon,
  Linkedin01Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

/**
 * Brand and channel glyphs. Lucide ships no brand marks, so these come from Hugeicons, the
 * same family Darb uses for its public footer, keeping both sites visually identical.
 */
export type SocialIconProps = { size?: number; className?: string };

function socialIcon(icon: IconSvgElement) {
  return function SocialIcon({ size = 18, className }: SocialIconProps) {
    return (
      <HugeiconsIcon
        icon={icon}
        size={size}
        strokeWidth={1.7}
        className={className}
        aria-hidden="true"
        focusable="false"
      />
    );
  };
}

export const IconInstagram = socialIcon(InstagramIcon);
export const IconGitHub = socialIcon(GithubIcon);
export const IconLinkedIn = socialIcon(Linkedin01Icon);
export const IconPortfolio = socialIcon(Globe02Icon);
export const IconChannelMail = socialIcon(Mail01Icon);
