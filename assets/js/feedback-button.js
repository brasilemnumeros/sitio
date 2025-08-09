/**
 * Feedback Button Manager - Handles mobile swipe functionality
 */

class FeedbackButtonManager {
  static initialize() {
    const btn = document.getElementById("feedback-btn");
    if (!btn) return;

    let startX = 0;
    let isDragging = false;

    btn.addEventListener(
      "touchstart",
      (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
      },
      { passive: true },
    );

    btn.addEventListener(
      "touchmove",
      (e) => {
        if (!isDragging) return;

        const currentX = e.touches[0].clientX;
        const diffX = startX - currentX;

        if (diffX > 10) {
          btn.style.transition = "all 0.3s ease";
          btn.style.right = "-4.8rem";
        }
      },
      { passive: true },
    );
  }
}

document.addEventListener("DOMContentLoaded", FeedbackButtonManager.initialize);
