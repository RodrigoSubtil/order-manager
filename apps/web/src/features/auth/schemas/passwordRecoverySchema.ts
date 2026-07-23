import { z } from 'zod';

export const passwordRecoverySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Introduza o email.')
    .email('Introduza um email válido.')
    .max(320, 'O email é demasiado longo.'),
});

export type PasswordRecoveryFormValues = z.infer<typeof passwordRecoverySchema>;
