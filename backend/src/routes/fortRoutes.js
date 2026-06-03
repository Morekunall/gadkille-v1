const express = require('express');
const mongoose = require('mongoose');
const Fort = require('../models/Fort');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

const requireFortId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid fort id' });
  }
  next();
};

// @route   GET /api/forts
// @desc    Get all forts with optional search by name
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q
      ? { name: { $regex: q, $options: 'i' } }
      : {};
    const forts = await Fort.find(filter).limit(50);
    res.json(forts);
  } catch (error) {
    console.error('Get forts error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin CRUD (register before GET /:slug)

// @route   POST /api/forts
// @desc    Create fort
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, slug, location } = req.body;
    if (!name || !slug || !location) {
      return res.status(400).json({ message: 'Name, slug and location are required' });
    }
    const exists = await Fort.findOne({ slug });
    if (exists) {
      return res.status(400).json({ message: 'Slug already in use' });
    }
    const fort = await Fort.create(req.body);
    res.status(201).json(fort);
  } catch (error) {
    console.error('Create fort error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/forts/:id
// @desc    Update fort
router.put('/:id', protect, adminOnly, requireFortId, async (req, res) => {
  try {
    const fort = await Fort.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!fort) return res.status(404).json({ message: 'Fort not found' });
    res.json(fort);
  } catch (error) {
    console.error('Update fort error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/forts/:id
// @desc    Delete fort
router.delete('/:id', protect, adminOnly, requireFortId, async (req, res) => {
  try {
    const fort = await Fort.findByIdAndDelete(req.params.id);
    if (!fort) return res.status(404).json({ message: 'Fort not found' });
    res.json({ message: 'Fort deleted', id: fort._id });
  } catch (error) {
    console.error('Delete fort error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/forts/:slug
// @desc    Get single fort by slug
router.get('/:slug', async (req, res) => {
  try {
    const fort = await Fort.findOne({ slug: req.params.slug });
    if (!fort) return res.status(404).json({ message: 'Fort not found' });
    res.json(fort);
  } catch (error) {
    console.error('Get fort error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

