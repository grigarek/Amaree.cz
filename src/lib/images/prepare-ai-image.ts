const maxDimension = 1280;
const targetBytes = 700_000;

function loadImage(source: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Fotografii se nepodařilo připravit pro AI."));
    };
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Fotografii se nepodařilo zmenšit.")), "image/jpeg", quality);
  });
}

function toDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Fotografii se nepodařilo načíst."));
    reader.readAsDataURL(blob);
  });
}

export async function prepareProductImageForAi(source: Blob) {
  const image = await loadImage(source);
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Prohlížeč neumí fotografii připravit pro AI.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let blob = await canvasBlob(canvas, 0.78);
  if (blob.size > targetBytes) blob = await canvasBlob(canvas, 0.62);
  if (blob.size > targetBytes && Math.max(canvas.width, canvas.height) > 960) {
    const resizeScale = 960 / Math.max(canvas.width, canvas.height);
    const smaller = document.createElement("canvas");
    smaller.width = Math.max(1, Math.round(canvas.width * resizeScale));
    smaller.height = Math.max(1, Math.round(canvas.height * resizeScale));
    const smallerContext = smaller.getContext("2d", { alpha: false });
    if (!smallerContext) throw new Error("Prohlížeč neumí fotografii připravit pro AI.");
    smallerContext.fillStyle = "#ffffff";
    smallerContext.fillRect(0, 0, smaller.width, smaller.height);
    smallerContext.drawImage(canvas, 0, 0, smaller.width, smaller.height);
    blob = await canvasBlob(smaller, 0.62);
  }
  if (blob.size > targetBytes) throw new Error("Fotografie je i po zmenšení příliš velká pro AI pomocníka.");
  return toDataUrl(blob);
}

export async function fetchAndPrepareProductImageForAi(url: string) {
  const response = await fetch(url, { credentials: "omit" });
  if (!response.ok) throw new Error("Uloženou fotografii se nepodařilo načíst pro AI.");
  return prepareProductImageForAi(await response.blob());
}
