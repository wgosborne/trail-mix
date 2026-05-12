const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const svgPath = path.join(publicDir, 'icon.svg');

async function generateIcons() {
  try {
    console.log('📦 Generating icons from icon.svg...');

    // Read the SVG file
    const svgBuffer = fs.readFileSync(svgPath);

    // Generate 192x192 PNG
    await sharp(svgBuffer)
      .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'icon-192x192.png'));
    console.log('✓ Generated icon-192x192.png');

    // Generate 512x512 PNG
    await sharp(svgBuffer)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'icon-512x512.png'));
    console.log('✓ Generated icon-512x512.png');

    // Generate favicon.ico (32x32)
    await sharp(svgBuffer)
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'favicon.ico'));
    console.log('✓ Generated favicon.ico');

    console.log('✨ All icons regenerated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();
