import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import toIco from 'to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const publicDir = path.resolve(__dirname, '..', '..', 'public');
  const imagesDir = path.join(publicDir, 'images');
  const originalPng = path.join(imagesDir, 'foresight-icon.png');
  const originalIco = path.join(publicDir, 'favicon.ico');

  // Backup original files
  try {
    await fs.access(originalPng);
    await fs.copyFile(originalPng, path.join(imagesDir, 'foresight-icon.original.png'));
  } catch (error) {
    console.warn(`Original PNG not found at ${originalPng}, skipping backup.`);
  }
  try {
    await fs.access(originalIco);
    await fs.copyFile(originalIco, path.join(publicDir, 'favicon.original.ico'));
  } catch (error) {
    console.warn(`Original ICO not found at ${originalIco}, skipping backup.`);
  }

  // Resize PNG for apple touch icon (180x180)
  await sharp(path.join(imagesDir, 'foresight-icon.original.png'))
    .resize(180, 180, { fit: 'contain' })
    .toFile(path.join(imagesDir, 'foresight-icon.png'));

  // Resize word logo from full version to height 24px
  const fullWordLogo = path.join(imagesDir, 'word-logo-full.png');
  await sharp(fullWordLogo)
    .trim()
    .resize({ height: 32, fit: 'contain' })
    .png()
    .toFile(path.join(imagesDir, 'word-logo.png'));

  // Generate favicon.ico with multiple sizes
  const sizes = [16, 32, 48, 64, 128];
  const buffers = await Promise.all(
    sizes.map(size =>
      sharp(path.join(imagesDir, 'foresight-icon.png'))
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );
  const icoBuffer = await toIco(buffers);
  await fs.writeFile(originalIco, icoBuffer);

  // Generate android-chrome icons
  await sharp(path.join(imagesDir, 'foresight-icon.png'))
    .resize(192, 192, { fit: 'contain' })
    .toFile(path.join(publicDir, 'android-chrome-192x192.png'));
  await sharp(path.join(imagesDir, 'foresight-icon.png'))
    .resize(512, 512, { fit: 'contain' })
    .toFile(path.join(publicDir, 'android-chrome-512x512.png'));

  // Generate apple-touch-icon
  await sharp(path.join(imagesDir, 'foresight-icon.png'))
    .resize(180, 180, { fit: 'contain' })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('Resized icons created successfully.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 