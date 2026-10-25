const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { exec } = require('child_process');
const path = require('path');

// 1-Click Evaluator Database Reset & Re-Seed
router.post(
  '/reset',
  asyncHandler(async (req, res) => {
    const seedScriptPath = path.resolve(__dirname, '../../../seed.js');
    exec(`node "${seedScriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Error executing seed reset:', error, stderr);
        return res.status(500).json({
          success: false,
          error: {
            code: 'SEED_RESET_FAILED',
            message: 'Failed to re-seed database',
            details: stderr,
          },
        });
      }
      res.status(200).json({
        success: true,
        message: 'Database re-seeded successfully with fresh demo environment.',
      });
    });
  })
);

module.exports = router;
