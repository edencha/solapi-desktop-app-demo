const mongoose = require('mongoose')

// Define Schemes
const accessTokenSchema = new mongoose.Schema(
  {
    accessToken: { type: String, required: true, unique: true },
    state: { type: String, required: true, unique: true }
  },
  {
    timestamps: true
  }
)

accessTokenSchema.index({ state: 1 }, { expireAfterSeconds: 86400 })

// Create Model & Export
module.exports = mongoose.model('AccessToken', accessTokenSchema)
