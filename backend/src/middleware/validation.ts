// import { Request, Response, NextFunction } from 'express';
// import { z } from 'zod';

// /**
//  * Generic validation middleware factory
//  */
// export function validate(schema: z.ZodSchema) {
//   return (req: Request, res: Response, next: NextFunction): void => {
//     try {
//       schema.parse({
//         body: req.body,
//         query: req.query,
//         params: req.params,
//       });
//       next();
//     } catch (error) {
//       if (error instanceof z.ZodError) {
//         res.status(400).json({
//           error: 'Validation Error',
//           details: error.errors.map(err => ({
//             path: err.path.join('.'),
//             message: err.message,
//           })),
//         });
//       } else {
//         res.status(500).json({
//           error: 'Internal Server Error',
//           message: 'Validation failed',
//         });
//       }
//     }
//   };
// }

// // Validation schemas
// export const schemas = {
//   createRound: z.object({
//     body: z.object({
//       question: z.string().min(10).max(500),
//       startTime: z.number().int().positive(),
//       endTime: z.number().int().positive(),
//       numOutcomes: z.number().int().min(2).max(10),
//       verificationType: z.enum(['pythPrice', 'onChainData', 'twitterAPI', 'switchboardVRF']),
//       targetValue: z.number().int(),
//       dataSource: z.string(),
//       oracle: z.string(),
//     }),
//   }),

//   placePrediction: z.object({
//     body: z.object({
//       roundId: z.number().int().positive(),
//       outcome: z.number().int().min(0),
//       amount: z.number().int().positive(),
//       userPubkey: z.string(),
//     }),
//   }),

//   settleRound: z.object({
//     params: z.object({
//       id: z.string().regex(/^\d+$/),
//     }),
//   }),

//   claimWinnings: z.object({
//     params: z.object({
//       roundId: z.string().regex(/^\d+$/),
//     }),
//     body: z.object({
//       userPubkey: z.string(),
//     }),
//   }),

//   getRound: z.object({
//     params: z.object({
//       id: z.string().regex(/^\d+$/),
//     }),
//   }),

//   getUserStats: z.object({
//     params: z.object({
//       address: z.string(),
//     }),
//   }),

//   emergencyCancel: z.object({
//     params: z.object({
//       id: z.string().regex(/^\d+$/),
//     }),
//     body: z.object({
//       reason: z.string().min(10).max(500),
//     }),
//   }),
// };
