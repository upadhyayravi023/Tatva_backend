const { z } = require('zod');

exports.initialScanSchema = z.object({
  body: z.object({
    qrId: z.string().min(1, 'qrId is required'),
  }),
});

exports.exitScanSchema = z.object({
  body: z.object({
    qrId: z.string().min(1, 'qrId is required'),
    breakType: z.enum(['SHORT', 'LUNCH', 'BREAKFAST']),
  }),
});

exports.entryScanSchema = z.object({
  body: z.object({
    qrId: z.string().min(1, 'qrId is required'),
  }),
});
