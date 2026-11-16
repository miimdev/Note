import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().trim().min(1, 'ایمیل لازم است').email('ایمیل معتبر نیست');

export const passwordSchema = z
  .string()
  .min(8, 'رمز عبور باید دست‌کم ۸ کاراکتر باشد')
  .max(72, 'رمز عبور بیش از حد طولانی است');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'رمز عبور لازم است'),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().max(80).optional(),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'تکرار رمز عبور یکسان نیست',
  });

/** Any TipTap JSON document; depth-limited to avoid pathological payloads. */
export const noteContentSchema: z.ZodType<{
  type: string;
  content?: unknown[];
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: unknown[];
}> = z.lazy(() =>
  z
    .object({
      type: z.string().min(1).max(64),
      attrs: z.record(z.unknown()).optional(),
      text: z.string().max(100_000).optional(),
      marks: z.array(z.record(z.unknown())).max(20).optional(),
      content: z.array(noteContentSchema).max(2_000).optional(),
    })
    .strict(),
);

export const noteInputSchema = z.object({
  title: z.string().trim().max(300).default(''),
  content: noteContentSchema,
  folder_id: uuidSchema.nullable().default(null),
});

export const notePatchSchema = noteInputSchema.partial().extend({
  icon: z.string().max(16).nullable().optional(),
  cover_url: z.string().url().max(2048).nullable().optional(),
  is_pinned: z.boolean().optional(),
  is_favorite: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  deleted_at: z.string().datetime().nullable().optional(),
  version: z.number().int().nonnegative().optional(),
});

export const folderInputSchema = z.object({
  name: z.string().trim().min(1, 'نام پوشه لازم است').max(120),
  parent_id: uuidSchema.nullable().default(null),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'رنگ باید به شکل #RRGGBB باشد')
    .nullable()
    .optional(),
  icon: z.string().max(32).nullable().optional(),
  position: z.number().int().min(0).max(10_000).optional(),
});

export const tagInputSchema = z.object({
  name: z.string().trim().min(1, 'نام برچسب لازم است').max(60),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'رنگ باید به شکل #RRGGBB باشد')
    .nullable()
    .optional(),
});

export const reminderInputSchema = z.object({
  note_id: uuidSchema,
  remind_at: z.string().datetime({ offset: true }),
  channel: z.enum(['browser', 'in_app']).default('browser'),
});

export const shareInputSchema = z.object({
  note_id: uuidSchema,
  expires_at: z.string().datetime({ offset: true }).nullable().default(null),
});

export const templateInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(240).nullable().optional(),
  content: noteContentSchema,
  icon: z.string().max(32).nullable().optional(),
});

export const navFilterSchema = z.object({
  q: z.string().max(200).default(''),
  folder: uuidSchema.optional(),
  tag: uuidSchema.optional(),
  sort: z
    .enum(['updated_desc', 'updated_asc', 'created_desc', 'created_asc', 'title_asc', 'title_desc'])
    .default('updated_desc'),
  archived: z.coerce.boolean().default(false),
});

export const aiActionSchema = z.object({
  action: z.enum(['summarize', 'rewrite', 'fix', 'translate', 'actions', 'tags', 'continue']),
  text: z.string().min(1, 'متنی برای پردازش وجود ندارد').max(24_000),
  locale: z.enum(['fa', 'en']).default('fa'),
  targetLocale: z.enum(['fa', 'en']).optional(),
  tone: z.enum(['neutral', 'friendly', 'formal', 'concise']).optional(),
});

export const purgeSchema = z.object({ noteId: uuidSchema });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type NoteInput = z.infer<typeof noteInputSchema>;
export type FolderInput = z.infer<typeof folderInputSchema>;
export type TagInput = z.infer<typeof tagInputSchema>;
export type AiActionInput = z.infer<typeof aiActionSchema>;
