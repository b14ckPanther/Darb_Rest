/**
 * Elevation of Darb's architectural doorway (shared with darb.co.il). It is architecture, not the
 * Darb mark, and it is never mirrored for right-to-left layouts.
 */
export const doorwayFramePath =
  "M2 96V31Q2 26 7 23.5L51 6Q55 4.5 58.5 6Q62 7.5 62 12V96H53V22Q53 17.5 49 18L15 32Q11 33.5 11 38V96Z";
export const doorwayOpeningPath = "M11 96V38Q11 33.5 15 32L49 18Q53 17.5 53 22V96Z";

export function DoorwayOutline({ className, lit = false }: { className?: string; lit?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 64 96" aria-hidden="true" focusable="false">
      {lit ? <path className="rs-doorway__light" d={doorwayOpeningPath} /> : null}
      <path className="rs-doorway__frame" d={doorwayFramePath} />
    </svg>
  );
}
