/**
 * Simple Mobile Chart Zoom Fix
 * Prevents page zoom while allowing Chart.js zoom plugin to work
 */

(function () {
  "use strict";

  let isInitialized = false;

  function initMobileZoomFix() {
    if (isInitialized) return;

    const canvas = document.getElementById("chart");
    if (!canvas) {
      // Try again later
      setTimeout(initMobileZoomFix, 500);
      return;
    }

    console.log("Initializing simple mobile zoom fix");

    // Debug: Check if zoom plugin is available
    setTimeout(() => {
      console.log("=== ZOOM PLUGIN CHECK ===");
      console.log("Chart.js loaded:", typeof Chart !== "undefined");
      if (typeof Chart !== "undefined") {
        console.log("Chart.version:", Chart.version);
        console.log("Chart.registry.plugins:", Chart.registry?.plugins);
        console.log(
          "Zoom plugin registered:",
          Chart.registry?.plugins?.has?.("zoom"),
        );
      }
      console.log("window.zoomPlugin:", typeof window.zoomPlugin);

      const chart =
        window.chartInstance ||
        (window.chartManager && window.chartManager.chart);
      if (chart) {
        console.log("Chart instance found");
        console.log("Zoom options:", chart.options?.plugins?.zoom);
      }
      console.log("=== END CHECK ===");
    }, 1000);

    // Set touch-action to allow Chart.js to handle everything
    canvas.style.touchAction = "none";

    // Prevent page zoom on double-tap
    canvas.addEventListener("touchstart", handleTouch, { passive: false });
    canvas.addEventListener("touchend", handleTouch, { passive: false });

    // For iOS Safari
    canvas.addEventListener("gesturestart", handleGesture, { passive: false });
    canvas.addEventListener("gesturechange", handleGesture, { passive: false });
    canvas.addEventListener("gestureend", handleGesture, { passive: false });

    // Prevent context menu
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    isInitialized = true;
    console.log("Mobile zoom fix initialized successfully");
  }

  function handleTouch(event) {
    // Let single touches pass through for Chart.js pan
    if (event.touches && event.touches.length === 1) {
      return;
    }

    // For multi-touch, prevent default to stop page zoom
    // but don't stop propagation so Chart.js still gets the event
    if (event.touches && event.touches.length > 1) {
      console.log("Multi-touch detected, preventing page zoom");
      event.preventDefault();
    }

    // Prevent double-tap zoom
    if (event.type === "touchend" && event.changedTouches.length === 1) {
      event.preventDefault();
    }
  }

  function handleGesture(event) {
    // Prevent iOS Safari gesture zoom on page
    console.log("iOS gesture detected:", event.type);
    event.preventDefault();
    // Don't stop propagation - let Chart.js handle it
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMobileZoomFix);
  } else {
    initMobileZoomFix();
  }

  // Re-initialize when chart is recreated
  const observer = new MutationObserver(() => {
    if (document.getElementById("chart") && !isInitialized) {
      console.log("Chart recreated, reinitializing mobile zoom fix");
      isInitialized = false;
      initMobileZoomFix();
    }
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
})();
