const Fort = require('../models/Fort');
const fortCatalog = require('../seeds/fortCatalog');

const ensureSeedForts = async () => {
  if (process.env.SEED_FORTS_ON_START === 'false') return;

  for (const fortData of fortCatalog) {
    await Fort.findOneAndUpdate(
      { slug: fortData.slug },
      { $set: fortData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`[seed] Ensured ${fortCatalog.length} forts (Lohagad, Visapur, Ramshej)`);
};

module.exports = ensureSeedForts;
