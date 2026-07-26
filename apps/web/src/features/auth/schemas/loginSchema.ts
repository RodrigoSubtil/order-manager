import { z } from 'zod';

import { isValidUsername, normalizeUsername } from '../lib/authIdentity';

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .transform(normalizeUsername)
    .refine(isValidUsername, 'Introduza um nome de utilizador válido.'),
  password: z.string().min(1, 'Introduza a senha.').max(128, 'A senha é demasiado longa.'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
