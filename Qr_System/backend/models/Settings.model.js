const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  singletonId: { type: String, default: 'STATIC_SETTINGS', unique: true },

  // Short break rules
  maxShortBreaks:          { type: Number, default: 4  },  // count limit
  maxShortBreakDurationMins: { type: Number, default: 30 }, // per-break duration limit (mins)


});

module.exports = mongoose.model('Settings', settingsSchema);
