// Make scroll arrow clickable to navigate to first section
document
  .querySelector(".scroll-indicator")
  .addEventListener("click", function () {
    // Scroll to the first content section
    window.scrollTo({
      top: window.innerHeight,
      behavior: "smooth",
    });
  });

// Hide/show elements based on scroll position
window.addEventListener("scroll", function () {
  const scrollPosition = window.scrollY;
  const windowHeight = window.innerHeight;

  // Elements to control visibility
  const mainContent = document.querySelector(".main-content");
  const navIcons = document.querySelector(".nav-icons");
  const scrollIndicator = document.querySelector(".scroll-indicator");

  // Start fading out much earlier - at 5% of the first viewport
  if (scrollPosition > windowHeight * 0.05) {
    // Calculate opacity based on scroll position
    // Make the fade happen over a shorter distance (10% of viewport)
    const opacity = Math.max(
      0,
      1 - (scrollPosition - windowHeight * 0.05) / (windowHeight * 0.27)
    );

    // Apply opacity to elements
    mainContent.style.opacity = opacity;
    navIcons.style.opacity = opacity;
    scrollIndicator.style.opacity = opacity;

    // When nearly invisible, hide elements completely
    if (opacity < 0.05) {
      mainContent.style.display = "none";
      navIcons.style.display = "none";
      scrollIndicator.style.display = "none";
    } else {
      // Restore display properties when visible
      mainContent.style.display = "flex";
      navIcons.style.display = "flex";
      scrollIndicator.style.display = "block";
      mainContent.style.pointerEvents = "auto";
      navIcons.style.pointerEvents = "auto";
      scrollIndicator.style.pointerEvents = "auto";
    }
  } else {
    // Reset to fully visible when in first viewport
    mainContent.style.opacity = 1;
    mainContent.style.display = "flex";
    navIcons.style.display = "flex";
    scrollIndicator.style.display = "block";
    mainContent.style.pointerEvents = "auto";
    navIcons.style.pointerEvents = "auto";
    scrollIndicator.style.pointerEvents = "auto";
  }
});

window.addEventListener("DOMContentLoaded", function () {
  // Initial setup
  updateHeights();

  // Wait for all images to load before final height calculation
  const images = document.querySelectorAll("img");
  let loadedImages = 0;

  images.forEach((img) => {
    if (img.complete) {
      loadedImages++;
      if (loadedImages === images.length) {
        updateHeights();
      }
    } else {
      img.addEventListener("load", () => {
        loadedImages++;
        if (loadedImages === images.length) {
          updateHeights();
        }
      });
    }
  });
});

// Separate function to update heights
function updateHeights() {
  const sections = document.querySelectorAll(".content-section");
  let totalSectionHeight = 0;

  // Add extra padding for each section to ensure content fits
  sections.forEach((section) => {
    const sectionContent = section.scrollHeight;
    const sectionImages = section.querySelectorAll("img").length;
    // Reduce extra space per image from 50px to 30px
    const extraSpace = sectionImages * 30;
    totalSectionHeight += sectionContent + extraSpace;
  });

  // Reduce buffer space from 200px to about 1/4 of viewport height
  const bufferSpace = Math.floor(window.innerHeight * 0.05);
  totalSectionHeight += bufferSpace;

  // Calculate total height including first viewport
  const totalHeight = totalSectionHeight + window.innerHeight;

  // Set heights with extra space
  document.body.style.minHeight = `${totalHeight}px`;
  document.querySelector(
    ".content-sections"
  ).style.minHeight = `${totalSectionHeight}px`;

  // Log for debugging
  console.log(`Buffer space: ${bufferSpace}px`);
  console.log(`Total height set to: ${totalHeight}px`);
  console.log(`Content sections height: ${totalSectionHeight}px`);
}

// Update heights on resize
window.addEventListener("resize", updateHeights);

// Add a mutation observer to handle dynamically added content
const observer = new MutationObserver(updateHeights);
observer.observe(document.querySelector(".content-sections"), {
  childList: true,
  subtree: true,
});
