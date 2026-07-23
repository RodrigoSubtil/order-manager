import { z } from 'zod';

export const managementAccessSchema = z.object({
  password: z
    .string()
    .min(1, 'Introduza a senha de gerenciamento.')
    .max(128, 'A senha é demasiado longa.'),
});

export type ManagementAccessFormValues = z.infer<typeof managementAccessSchema>;
