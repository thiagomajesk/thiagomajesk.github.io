import "unpoly";
import ScrollProgress from "scroll-progress-indicator";

up.on("up:fragment:inserted", () => {
  ScrollProgress.init({
    color: "#50FA7B",
    height: "4px",
    position: "bottom",
  });
});
