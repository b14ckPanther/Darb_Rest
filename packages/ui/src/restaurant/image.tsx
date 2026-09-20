"use client";
import { useState, type ImgHTMLAttributes } from "react";
export function RestaurantImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      {...props}
      decoding="async"
      data-failed={failed || undefined}
      onError={() => setFailed(true)}
      style={{ ...props.style, visibility: failed ? "hidden" : undefined }}
    />
  );
}
