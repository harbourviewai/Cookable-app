// One-shot renderer: turns the SVG masters in assets/icon-source into the
// PNG assets Expo expects in assets/images. Run with `node tools/render-icons.mjs`
// from the `app/` directory after editing any SVG source.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const src = (name) => resolve(root, 'assets/icon-source', name);
const out = (name) => resolve(root, 'assets/images', name);

const PINE = { r: 45, g: 95, b: 78, alpha: 1 };
const LINEN = { r: 250, g: 247, b: 242, alpha: 1 };

async function render({ svg, dest, size, bg, dropAlpha }) {
  const buf = readFileSync(svg);
  const pipeline = sharp(buf, { density: 384 }).resize(size, size, { fit: 'contain' });
  if (bg) pipeline.flatten({ background: bg });
  if (dropAlpha) pipeline.removeAlpha();
  const png = await pipeline.png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(dest, png);
  console.log(`  ${dest.replace(root + '\\', '').replace(root + '/', '')}  ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB`);
}

console.log('Rendering Cookable icon assets...');

// 1. Primary master — App Store / iOS / fallback. No transparency (Apple requirement).
await render({ svg: src('icon-master.svg'), dest: out('icon.png'), size: 1024, bg: PINE, dropAlpha: true });

// 2. Android adaptive foreground — transparent, logo within 66% safe zone.
await render({ svg: src('icon-adaptive-foreground.svg'), dest: out('adaptive-icon.png'), size: 1024 });

// 3. Splash — mono-Pine bowl on transparent; sits on the Linen splash bg.
await render({ svg: src('icon-splash.svg'), dest: out('splash-icon.png'), size: 1024 });

// 4. Favicon — primary variant, small.
await render({ svg: src('icon-master.svg'), dest: out('favicon.png'), size: 48, bg: PINE, dropAlpha: true });

// 5. Loading-scene bowl — Pine bowl silhouette, transparent canvas. Stacked with
//    loading-swirl in <RecipeLoading /> while a scan is being processed.
await render({ svg: src('loading-bowl.svg'), dest: out('loading-bowl.png'), size: 512 });

// 6. Loading-scene swirl — Saffron swirl stroke, transparent canvas. Animated
//    above the bowl independently via RN Animated.
await render({ svg: src('loading-swirl.svg'), dest: out('loading-swirl.png'), size: 512 });

console.log('Done.');
