-- Legacy entrypoint intentionally disabled. No credentials or destructive DDL.
-- Use npm run db:migrate:plan / db:migrate:apply with an explicitly verified target.
DO $$
BEGIN
  RAISE EXCEPTION 'Legacy schema loader disabled. Use migrations/versioned through db:migrate:apply.';
END;
$$;
