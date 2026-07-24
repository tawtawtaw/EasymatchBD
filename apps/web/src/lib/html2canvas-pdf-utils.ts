import {
  BIODATA_PDF_CSS,
  MEMBERSHIP_RECEIPT_CSS,
} from "@/lib/pdf-document-styles";

const UNSAFE_COLOR_PATTERN = /oklch\(|lab\(|color-mix\(/i;

const COLOR_PROPERTIES = [
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "caret-color",
  "column-rule-color",
] as const;

let colorProbeContext: CanvasRenderingContext2D | null = null;

function cssColorToCanvasSafe(color: string): string {
  if (!color || color === "transparent" || color === "inherit") {
    return color;
  }
  if (!UNSAFE_COLOR_PATTERN.test(color)) {
    return color;
  }

  if (!colorProbeContext) {
    const canvas = document.createElement("canvas");
    colorProbeContext = canvas.getContext("2d");
  }
  if (!colorProbeContext) {
    return color;
  }

  colorProbeContext.fillStyle = "#000000";
  colorProbeContext.fillStyle = color;
  return colorProbeContext.fillStyle;
}

function replaceUnsafeColors(value: string): string {
  if (!UNSAFE_COLOR_PATTERN.test(value)) {
    return value;
  }

  return value.replace(
    /(?:oklab?|color-mix)\([^)]*\)/gi,
    (match) => cssColorToCanvasSafe(match),
  );
}

function inlineSafeColors(root: HTMLElement, view: Window) {
  for (const element of [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]) {
    const computed = view.getComputedStyle(element);

    for (const property of COLOR_PROPERTIES) {
      const value = computed.getPropertyValue(property);
      if (!value || !UNSAFE_COLOR_PATTERN.test(value)) {
        continue;
      }
      element.style.setProperty(property, cssColorToCanvasSafe(value));
    }

    const boxShadow = computed.getPropertyValue("box-shadow");
    if (boxShadow && UNSAFE_COLOR_PATTERN.test(boxShadow)) {
      element.style.setProperty("box-shadow", replaceUnsafeColors(boxShadow));
    }

    const textShadow = computed.getPropertyValue("text-shadow");
    if (textShadow && UNSAFE_COLOR_PATTERN.test(textShadow)) {
      element.style.setProperty("text-shadow", replaceUnsafeColors(textShadow));
    }

    const border = computed.getPropertyValue("border");
    if (border && UNSAFE_COLOR_PATTERN.test(border)) {
      element.style.setProperty("border", replaceUnsafeColors(border));
    }
  }
}

export function resolvePdfDocumentStyles(element: HTMLElement): string {
  if (
    element.classList.contains("biodata-pdf-root") ||
    element.querySelector(".biodata-pdf-root")
  ) {
    return BIODATA_PDF_CSS;
  }

  if (
    element.classList.contains("membership-receipt-root") ||
    element.querySelector(".membership-receipt-root")
  ) {
    return MEMBERSHIP_RECEIPT_CSS;
  }

  return BIODATA_PDF_CSS;
}

export function prepareHtml2CanvasClone(
  clonedDoc: Document,
  sourceElement: HTMLElement,
  safeStyles: string,
) {
  clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((node) => {
    node.remove();
  });

  clonedDoc.querySelectorAll("style").forEach((node) => {
    node.remove();
  });

  const style = clonedDoc.createElement("style");
  style.textContent = safeStyles;
  clonedDoc.head.appendChild(style);

  clonedDoc.documentElement.style.backgroundColor = "#ffffff";
  clonedDoc.body.style.backgroundColor = "#ffffff";
  clonedDoc.body.style.color = "#18181b";
  clonedDoc.body.style.margin = "0";

  const view = clonedDoc.defaultView;
  if (!view) {
    return;
  }

  inlineSafeColors(sourceElement, view);
}

export function createHtml2CanvasOnCloneHandler(sourceElement: HTMLElement) {
  const safeStyles = resolvePdfDocumentStyles(sourceElement);

  return (clonedDoc: Document) => {
    const clonedRoot =
      clonedDoc.querySelector(".biodata-pdf-root") ??
      clonedDoc.querySelector(".membership-receipt-root") ??
      clonedDoc.body.firstElementChild;

    if (!(clonedRoot instanceof HTMLElement)) {
      return;
    }

    prepareHtml2CanvasClone(clonedDoc, clonedRoot, safeStyles);
  };
}
