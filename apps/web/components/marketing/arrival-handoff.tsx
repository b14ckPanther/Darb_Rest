/**
 * Continuity with darb.co.il: when a visitor arrives from Darb's lit Restaurant doorway, a veil of
 * the corridor's light fades as the hero doorway opens. The script runs during HTML parsing so the
 * first paint already carries the light; it never delays navigation or content.
 */
const script = `(function(){try{var v=document.currentScript&&document.currentScript.previousElementSibling;if(!v||!document.referrer||matchMedia("(prefers-reduced-motion: reduce)").matches)return;var r=new URL(document.referrer),h=r.hostname;var darb=h==="darb.co.il"||h==="www.darb.co.il"||((h==="localhost"||h==="127.0.0.1")&&r.port==="3000");if(darb&&r.origin!==location.origin)v.setAttribute("data-play","")}catch(e){}})();`;

export function ArrivalHandoff() {
  return (
    <>
      <div className="rs-arrival-veil" aria-hidden="true" suppressHydrationWarning />
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </>
  );
}
