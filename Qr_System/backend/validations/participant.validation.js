const { z } = require('zod');

exports.registerParticipantSchema = z.object({
  body: z.object({
    teamId: z.string().min(1, 'teamId is required'),
    teamName: z.string().min(1, 'teamName is required'),
    name: z.string().min(1, 'name is required'),
    rollNumber: z.string().min(1, 'rollNumber is required'),
    mobile: z.string().min(1, 'mobile is required'),
    qrId: z.string().min(1, 'qrId is required'),
  }),
});
