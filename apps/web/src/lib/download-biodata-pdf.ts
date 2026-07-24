import { createHtml2CanvasOnCloneHandler } from "@/lib/html2canvas-pdf-utils";

async function waitForImages(container: HTMLElement) {
  const images = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  );
}

type DisabledStylesheet = HTMLLinkElement | HTMLStyleElement;

function disablePageStylesheets(): DisabledStylesheet[] {
  const disabled: DisabledStylesheet[] = [];

  document
    .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
    .forEach((link) => {
      if (!link.disabled) {
        link.disabled = true;
        disabled.push(link);
      }
    });

  document.querySelectorAll<HTMLStyleElement>("style").forEach((style) => {
    if (!style.disabled) {
      style.disabled = true;
      disabled.push(style);
    }
  });

  return disabled;
}

function restorePageStylesheets(disabled: DisabledStylesheet[]) {
  for (const sheet of disabled) {
    sheet.disabled = false;
  }
}

function html2CanvasOptions(element: HTMLElement) {
  return {
    scale: 1.5,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    onclone: createHtml2CanvasOnCloneHandler(element),
  };
}

async function withPdfCapture<T>(
  element: HTMLElement,
  render: () => Promise<T>,
): Promise<T> {
  const disabledStylesheets = disablePageStylesheets();
  try {
    return await render();
  } finally {
    restorePageStylesheets(disabledStylesheets);
  }
}

export async function downloadBiodataPdf(
  element: HTMLElement,
  filename: string,
) {
  await waitForImages(element);

  const html2pdf = (await import("html2pdf.js")).default;

  await withPdfCapture(element, () =>
    html2pdf()
      .set({
        margin: [12, 12, 14, 12],
        filename,
        image: { type: "jpeg", quality: 0.92 },
        html2canvas: html2CanvasOptions(element),
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: ".biodata-pdf-section" },
      })
      .from(element)
      .save(),
  );
}

export async function printBiodataPdf(element: HTMLElement) {
  await waitForImages(element);

  const html2pdf = (await import("html2pdf.js")).default;

  const blob = await withPdfCapture(element, () =>
    html2pdf()
      .set({
        margin: [12, 12, 14, 12],
        image: { type: "jpeg", quality: 0.92 },
        html2canvas: html2CanvasOptions(element),
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: ".biodata-pdf-section" },
      })
      .from(element)
      .outputPdf("blob"),
  );

  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url);
  if (!printWindow) {
    URL.revokeObjectURL(url);
    throw new Error("Could not open print window");
  }
  printWindow.addEventListener("load", () => {
    printWindow.focus();
    printWindow.print();
  });
}
