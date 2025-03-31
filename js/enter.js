document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("bgVideo");
  const filterToggle = document.getElementById("filterToggle");

  filterToggle.addEventListener("change", () => {
    video.classList.toggle("pink-filter");
  });
});
