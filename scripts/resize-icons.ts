import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import toIco from 'to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const publicDir = path.resolve(__dirname, '..', 'public');
  const imagesDir = path.join(publicDir, 'images');
  const originalPng = path.join(imagesDir, 'foresight-icon.png');
  const originalIco = path.join(publicDir, 'favicon.ico');

  // Backup original files
  await fs.copyFile(originalPng, path.join(imagesDir, 'foresight-icon.original.png'));
  await fs.copyFile(originalIco, path.join(publicDir, 'favicon.original.ico'));

  // Resize PNG for apple touch icon (180x180)
  await sharp(path.join(imagesDir, 'foresight-icon.original.png'))
    .resize(180, 180, { fit: 'contain' })
    .toFile(path.join(imagesDir, 'foresight-icon.png'));

  // Backup and resize word logo to height 24px
  const originalWordLogo = path.join(imagesDir, 'word-logo.png');
  await fs.copyFile(originalWordLogo, path.join(imagesDir, 'word-logo.original.png'));
  await sharp(path.join(imagesDir, 'word-logo.original.png'))
    .trim()
    .resize({ height: 24, fit: 'contain' })
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

  console.log('Resized icons created successfully.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 