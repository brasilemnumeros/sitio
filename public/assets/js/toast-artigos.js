// Toast convite para artigos
(function () {
  const toastKey = "hideToastArtigos";
  function hideToast() {
    var toast = document.getElementById("toast-artigos");
    if (toast) toast.style.display = "none";
    localStorage.setItem(toastKey, "1");
  }
  function showToastIfNeeded() {
    if (!localStorage.getItem(toastKey)) {
      setTimeout(function () {
        var toast = document.getElementById("toast-artigos");
        var closeBtn = document.getElementById("toast-artigos-close");
        var link = document.getElementById("toast-artigos-link");
        if (toast) toast.style.display = "flex";
        if (closeBtn) closeBtn.onclick = hideToast;
        if (link) link.onclick = hideToast;
      }, 1200);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showToastIfNeeded);
  } else {
    showToastIfNeeded();
  }
})();
