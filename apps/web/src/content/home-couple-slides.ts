/** Hero carousel photos from public/home/couples/ (Photo for Website folder). */
export type HomeCoupleSlide = {
  id: string;
  imageSrc: string;
  altKey: string;
  captionKey: string;
  /** Infographics should stay fully visible instead of being cropped. */
  fit?: "cover" | "contain";
};

export const HOME_COUPLE_SLIDES: HomeCoupleSlide[] = [
  {
    id: "hero-1",
    imageSrc: "/home/couples/hero-1.webp",
    altKey: "slide1Alt",
    captionKey: "slide1Caption",
  },
  {
    id: "hero-2",
    imageSrc: "/home/couples/hero-2.webp",
    altKey: "slide2Alt",
    captionKey: "slide2Caption",
  },
  {
    id: "hero-3",
    imageSrc: "/home/couples/hero-3.webp",
    altKey: "slide3Alt",
    captionKey: "slide3Caption",
  },
  {
    id: "hero-6",
    imageSrc: "/home/couples/hero-6.webp",
    altKey: "slide6Alt",
    captionKey: "slide6Caption",
  },
];
