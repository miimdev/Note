# E2E tests (Playwright)

These specs cover the routes that work **without** Supabase secrets:

- `/login`, `/signup`, `/forgot-password` render and link to each other
- protected routes redirect to `/login` when there is no session
- invalid public share tokens show a friendly message and the API returns 400
- the PWA manifest and offline shell are served

## Authenticated flows

For the full flow (sign up → create note → `[[link]]` → search → share) run the
suite against a project with credentials:

```bash
# .env.local must contain NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
E2E_EMAIL=you@example.com E2E_PASSWORD=secret npm run test:e2e
```

The authenticated specs are skipped automatically when `E2E_EMAIL` is missing,
so CI stays green without secrets.
