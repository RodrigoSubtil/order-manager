import { z } from 'zod';

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Introduza o email.')
    .email('Introduza um email válido.')
    .max(320, 'O email é demasiado longo.'),
  password: z
    .string()
    .min(1, 'Introduza a palavra-passe.')
    .max(128, 'A palavra-passe é demasiado longa.'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
