const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process');

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <!-- Neo-Brutalist Tactile Drop Shadow -->
  <rect x="6" y="6" width="52" height="52" rx="14" fill="#121214" />
  
  <!-- Vibrant Fluorescent Lime Face -->
  <rect x="3" y="3" width="52" height="52" rx="14" fill="#D4F77C" stroke="#121214" stroke-width="3" />

  <!-- Bridge Horizontal Deck -->
  <line x1="9" y1="46" x2="49" y2="46" stroke="#121214" stroke-width="3.5" stroke-linecap="round" />

  <!-- Bridge Vertical Piers -->
  <line x1="13" y1="46" x2="13" y2="50" stroke="#121214" stroke-width="3" stroke-linecap="round" />
  <line x1="45" y1="46" x2="45" y2="50" stroke="#121214" stroke-width="3" stroke-linecap="round" />

  <!-- Bridge Suspension Cables -->
  <line x1="21" y1="33" x2="21" y2="46" stroke="#121214" stroke-width="2.5" stroke-linecap="round" />
  <line x1="37" y1="33" x2="37" y2="46" stroke="#121214" stroke-width="2.5" stroke-linecap="round" />

  <!-- Bridge Suspension Arch -->
  <path d="M 13 46 C 13 29, 45 29, 45 46" fill="none" stroke="#121214" stroke-width="3.5" stroke-linecap="round" />

  <!-- Care Daisy Bloom (6 Petals at 60-degree increments) -->
  <g transform="translate(29, 21.5)">
    <!-- Petals -->
    <circle cx="0" cy="-7.5" r="3.5" fill="#FFFFFF" stroke="#121214" stroke-width="1.8" />
    <circle cx="6.5" cy="-3.75" r="3.5" fill="#FFFFFF" stroke="#121214" stroke-width="1.8" />
    <circle cx="6.5" cy="3.75" r="3.5" fill="#FFFFFF" stroke="#121214" stroke-width="1.8" />
    <circle cx="0" cy="7.5" r="3.5" fill="#FFFFFF" stroke="#121214" stroke-width="1.8" />
    <circle cx="-6.5" cy="3.75" r="3.5" fill="#FFFFFF" stroke="#121214" stroke-width="1.8" />
    <circle cx="-6.5" cy="-3.75" r="3.5" fill="#FFFFFF" stroke="#121214" stroke-width="1.8" />

    <!-- Center Warm Core -->
    <circle cx="0" cy="0" r="4.8" fill="#FEE159" stroke="#121214" stroke-width="2.2" />
    <!-- Light Reflection Specular -->
    <circle cx="-1.2" cy="-1.2" r="1.2" fill="#FFFFFF" />
  </g>
</svg>`;

async function main() {
  console.log('Generating brand assets...');
  
  // 1. Save SVG icons
  fs.writeFileSync(path.join(__dirname, '../app/icon.svg'), svgIcon.trim());
  fs.writeFileSync(path.join(__dirname, '../public/favicon.svg'), svgIcon.trim());
  console.log('✓ Wrote app/icon.svg and public/favicon.svg');

  const svgBuffer = Buffer.from(svgIcon);

  // 2. High-res PNG exports via Sharp
  const sizes = [
    { size: 16, name: 'favicon-16.png' },
    { size: 32, name: 'favicon-32.png' },
    { size: 48, name: 'favicon-48.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 192, name: 'icon-192.png' },
    { size: 512, name: 'icon-512.png' },
  ];

  for (const s of sizes) {
    const outPath = path.join(__dirname, '../public', s.name);
    await sharp(svgBuffer)
      .resize(s.size, s.size)
      .png()
      .toFile(outPath);
    console.log(`✓ Generated public/${s.name} (${s.size}x${s.size})`);
  }

  // Also copy apple-touch-icon to app/apple-icon.png for Next.js App Router
  fs.copyFileSync(
    path.join(__dirname, '../public/apple-touch-icon.png'),
    path.join(__dirname, '../app/apple-icon.png')
  );
  console.log('✓ Copied to app/apple-icon.png');

  // 3. Multi-layer ICO generation with Pillow
  const pyScript = `
from PIL import Image
p16 = Image.open('public/favicon-16.png')
p32 = Image.open('public/favicon-32.png')
p48 = Image.open('public/favicon-48.png')

# Save multi-size ICO
p48.save('public/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
p48.save('app/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
print('✓ Successfully generated multi-size public/favicon.ico & app/favicon.ico')
`;
  execSync(`python3 -c "${pyScript}"`, { cwd: path.join(__dirname, '..') });

  // Clean up temporary PNGs from public
  ['favicon-16.png', 'favicon-32.png', 'favicon-48.png'].forEach(f => {
    try { fs.unlinkSync(path.join(__dirname, '../public', f)); } catch {}
  });

  console.log('All brand icon assets created successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
