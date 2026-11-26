# Edge Function configuration

Set the `ALLOWED_ORIGINS` secret in Supabase before deployment. Use a
comma-separated exact allowlist, for example:

```text
http://localhost:5173,https://your-project.vercel.app
```

For the current production site, the value should include
`https://flipbook-studio-three.vercel.app`.

Include the production custom domain and only the Vercel preview domains that
need to call these functions. Do not use `*` for authenticated admin routes.

Deploy `unpublish-flipbook` together with `publish-flipbook`; both functions
require the same `ALLOWED_ORIGINS` allowlist and authenticated administrator
session.

Deploy `grade-activity-essay` with the LKPD functions. It accepts only an
authenticated active administrator and delegates ownership and score checks to
`admin_grade_essay` in the database.
