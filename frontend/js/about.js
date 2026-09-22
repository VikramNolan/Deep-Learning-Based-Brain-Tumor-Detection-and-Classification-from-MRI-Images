/**
 * NeuroScan AI — About Page Controller
 * Interactive visualizations, CNN architecture layer viewer, and reading progress.
 */

document.addEventListener("DOMContentLoaded", () => {
  initCnnLayerHoverEffects();
  initTableOfContentsSpy();
});

/**
 * Adds interactive visual highlighting when hovering over CNN architecture layers
 */
function initCnnLayerHoverEffects() {
  const layerRows = document.querySelectorAll(".cnn-layer-row");

  layerRows.forEach((row) => {
    row.addEventListener("mouseenter", () => {
      row.style.borderColor = "var(--accent-cyan)";
      row.style.boxShadow = "0 0 15px rgba(0, 240, 255, 0.15)";
    });

    row.addEventListener("mouseleave", () => {
      row.style.borderColor = "var(--border-subtle)";
      row.style.boxShadow = "none";
    });
  });
}

/**
 * Scrollspy for smooth section tracking if a TOC is present
 */
function initTableOfContentsSpy() {
  const sections = document.querySelectorAll("article[id]");
  const navLinks = document.querySelectorAll(".toc-link");

  if (!sections.length || !navLinks.length) return;

  window.addEventListener("scroll", () => {
    let currentId = "";
    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 120;
      if (window.scrollY >= sectionTop) {
        currentId = section.getAttribute("id") || "";
      }
    });

    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${currentId}`);
    });
  });
}
