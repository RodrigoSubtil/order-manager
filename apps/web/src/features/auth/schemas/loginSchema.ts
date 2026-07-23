import { z } from 'zod';

import { normalizeUsername } from '../lib/authIdentity';

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'O utilizador deve ter pelo menos 3 caracteres.')
    .max(64, 'O utilizador deve ter no máximo 64 caracteres.')
    .refine(
      (value) => normalizeUsername(value).length >= 3,
      'Introduza um nome de utilizador válido.',
    ),
  password: z.string().min(1, 'Introduza a senha.').max(128, 'A senha é demasiado longa.'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
