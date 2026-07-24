/** Hero carousel photos from public/home/couples/ (Photo for Website folder). */
export type HomeCoupleSlide = {
  id: string;
  imageSrc: string;
  altKey: string;
  captionKey: string;
};

export const HOME_COUPLE_SLIDES: HomeCoupleSlide[] = [
  {
    id: "hero-1",
    imageSrc: "/home/couples/hero-1.png",
    altKey: "slide1Alt",
    captionKey: "slide1Caption",
  },
  {
    id: "hero-2",
    imageSrc: "/home/couples/hero-2.png",
    altKey: "slide2Alt",
    captionKey: "slide2Caption",
  },
  {
    id: "hero-3",
    imageSrc: "/home/couples/hero-3.png",
    altKey: "slide3Alt",
    captionKey: "slide3Caption",
  },
];
