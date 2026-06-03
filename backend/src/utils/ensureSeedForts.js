const Fort = require('../models/Fort');
const fortCatalog = require('../seeds/fortCatalog');

const ensureSeedForts = async () => {
  if (process.env.SEED_FORTS_ON_START === 'false') return;

  let created = 0;
  for (const fortData of fortCatalog) {
    const exists = await Fort.findOne({ slug: fortData.slug }).select('_id');
    if (exists) continue;

    await Fort.create(fortData);
    created += 1;
  }

  if (created) {
    console.log(`[seed] Created ${created} demo fort(s) (missing slugs only — deleted forts stay deleted)`);
  } else {
    console.log('[seed] Demo forts skipped (already present or removed by admin)');
  }
};

module.exports = ensureSeedForts;
