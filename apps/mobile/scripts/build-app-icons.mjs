import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const assets = path.join(root, "assets");
const androidRes = path.join(root, "android", "app", "src", "main", "res");
const logoPath = path.join(assets, "logo.png");

async function containOnSquare(size, logoMaxRatio) {
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  });

  const maxEdge = Math.round(size * logoMaxRatio);
  const logo = await sharp(logoPath)
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const meta = await sharp(logo).metadata();
  const left = Math.round((size - (meta.width ?? maxEdge)) / 2);
  const top = Math.round((size - (meta.height ?? maxEdge)) / 2);

  return canvas
    .composite([{ input: logo, left, top }])
    .png({ compressionLevel: 9 });
}

async function writePng(file, buffer) {
  await sharp(buffer).png({ compressionLevel: 9 }).toFile(file);
  console.log("wrote", path.relative(root, file));
}

async function writeWebp(file, buffer, size) {
  await sharp(buffer).resize(size, size).webp({ quality: 90 }).toFile(file);
  console.log("wrote", path.relative(root, file));
}

async function main() {
  const icon = await (await containOnSquare(1024, 0.88)).png().toBuffer();
  const adaptive = await (await containOnSquare(1024, 0.62)).png().toBuffer();
  const splash = await (await containOnSquare(1024, 0.78)).png().toBuffer();

  await writePng(path.join(assets, "icon.png"), icon);
  await writePng(path.join(assets, "adaptive-icon.png"), adaptive);
  await writePng(path.join(assets, "splash-icon.png"), splash);
  await writePng(
    path.join(assets, "favicon.png"),
    await (await containOnSquare(48, 0.88)).png().toBuffer(),
  );

  const launcher = {
    mdpi: 48,
    hdpi: 72,
    xhdpi: 96,
    xxhdpi: 144,
    xxxhdpi: 192,
  };
  const foreground = {
    mdpi: 108,
    hdpi: 162,
    xhdpi: 216,
    xxhdpi: 324,
    xxxhdpi: 432,
  };
  const splashLogo = {
    mdpi: 200,
    hdpi: 300,
    xhdpi: 400,
    xxhdpi: 600,
    xxxhdpi: 800,
  };

  for (const [density, size] of Object.entries(launcher)) {
    const dir = path.join(androidRes, `mipmap-${density}`);
    await writeWebp(path.join(dir, "ic_launcher.webp"), icon, size);
    await writeWebp(path.join(dir, "ic_launcher_round.webp"), icon, size);
  }

  for (const [density, size] of Object.entries(foreground)) {
    const dir = path.join(androidRes, `mipmap-${density}`);
    await writeWebp(
      path.join(dir, "ic_launcher_foreground.webp"),
      adaptive,
      size,
    );
  }

  for (const [density, size] of Object.entries(splashLogo)) {
    const dir = path.join(androidRes, `drawable-${density}`);
    await writePng(
      path.join(dir, "splashscreen_logo.png"),
      await (await containOnSquare(size, 0.78)).png().toBuffer(),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
