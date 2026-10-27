"use client";
import { useEffect, useRef } from 'react';

// Shows the existing tool page (public/pi-ocr.html) unchanged, sized to its content so the page scrolls, not the frame.
export default function ToolFrame({ src, title }) {
  const ref = useRef(null);
  const fit = () => {
    const f = ref.current, doc = f && f.contentDocument;
    if (!doc || !doc.body || doc.readyState !== 'complete' || f.contentWindow.location.href === 'about:blank') return;
    doc.body.style.minHeight = '0'; // the tool's body is 100vh tall, which would make the frame grow forever
    new ResizeObserver(() => { f.style.height = doc.body.offsetHeight + 'px'; }).observe(doc.body);
  };
  useEffect(fit, []); // covers a frame that finished loading before React attached onLoad
  return <iframe ref={ref} src={src} title={title} onLoad={fit} scrolling="no" className="block w-full border-0 min-h-[80vh]" />;
}
