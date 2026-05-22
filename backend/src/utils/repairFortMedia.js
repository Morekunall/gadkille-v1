const fs = require('fs');
const path = require('path');
const Fort = require('../models/Fort');
const fortCatalog = require('../seeds/fortCatalog');

const uploadsImagesDir = path.join(process.cwd(), 'uploads', 'images');
const bundledDir = path.join(__dirname, '..', 'assets', 'fort-images');

const catalogImagesBySlug = Object.fromEntries(fortCatalog.map((f) => [f.slug, f.images || []]));

const syncBundledImages = () => {
  fs.mkdirSync(uploadsImagesDir, { recursive: true });
  if (!fs.existsSync(bundledDir)) return 0;

  let copied = 0;
  for (const name of fs.readdirSync(bundledDir)) {
    if (!/\.(jpe?g|png|webp|gif)$/i.test(name)) continue;
    const dest = path.join(uploadsImagesDir, name);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(bundledDir, name), dest);
      copied += 1;
    }
  }
  if (copied) console.log(`[media] Copied ${copied} bundled image(s) to uploads/images`);
  return copied;
};

const localFilenameFromRef = (ref) => {
  if (!ref) return null;
  const value = String(ref).trim();
  const match = value.match(/\/images\/([^/?#]+)$/i);
  return match ? match[1] : null;
};

const isLocalImageRef = (ref) => Boolean(localFilenameFromRef(ref));

const localImageExists = (ref) => {
  const filename = localFilenameFromRef(ref);
  if (!filename) return false;
  return fs.existsSync(path.join(uploadsImagesDir, filename));
};

const repairBrokenFortImages = async () => {
  syncBundledImages();

  const forts = await Fort.find({});
  let repaired = 0;

  for (const fort of forts) {
    const images = Array.isArray(fort.images) ? fort.images : [];
    const kept = images.filter((img) => !isLocalImageRef(img) || localImageExists(img));
    const missingLocal = images.some((img) => isLocalImageRef(img) && !localImageExists(img));

    if (!missingLocal) continue;

    const fallback = catalogImagesBySlug[fort.slug] || [];
    const merged = [...kept];
    for (const url of fallback) {
      if (!merged.includes(url)) merged.push(url);
    }

    fort.images = merged.length ? merged : fallback.length ? fallback : images;
    await fort.save();
    repaired += 1;
    console.log(`[media] Repaired missing uploads for "${fort.name}" (${fort.slug})`);
  }

  if (!repaired) {
    console.log('[media] Fort image paths OK (or using remote URLs)');
  }
};

module.exports = repairBrokenFortImages;
