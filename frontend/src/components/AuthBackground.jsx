import { useEffect } from "react";


export default function AuthBackground() {
  useEffect(() => {
    function removeSplineBadge(root = document) {
      const selectors = [
        'a[href*="spline.design"]',
        '[aria-label*="Spline" i]',
        '[title*="Spline" i]',
      ];

      selectors.forEach((selector) => {
        root.querySelectorAll?.(selector).forEach((node) => node.remove());
      });

      root.querySelectorAll?.("*").forEach((node) => {
        if (node.shadowRoot) {
          removeSplineBadge(node.shadowRoot);
        }

        if (node.textContent?.trim().toLowerCase() === "built with spline") {
          node.remove();
        }
      });
    }

    if (!document.querySelector("script[data-spline-viewer]")) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = "https://unpkg.com/@splinetool/viewer@1.0.51/build/spline-viewer.js";
      script.dataset.splineViewer = "true";
      document.head.appendChild(script);
    }

    removeSplineBadge();
    const observer = new MutationObserver(() => removeSplineBadge());
    observer.observe(document.body, { childList: true, subtree: true });
    const cleanupTimer = window.setInterval(removeSplineBadge, 600);

    return () => {
      observer.disconnect();
      window.clearInterval(cleanupTimer);
    };
  }, []);

  return (
    <div className="background-container" aria-hidden="true">
      <div className="spline-stage">
        <spline-viewer url="https://prod.spline.design/959JIazaE0Tgcak0/scene.splinecode"></spline-viewer>
      </div>
      <div className="bg-overlay" />
    </div>
  );
}
