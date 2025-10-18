RBAC for siteareahyderabad backend

Overview
- Supabase auth is used for authentication. Frontend should continue to sign in as before and send the returned access token in Authorization header (Bearer <token>) when calling protected endpoints.
- Roles are stored in a custom table `user_roles` with schema: (id int PK, user_id uuid references auth.users.id, role text).
- Server reads roles from `user_roles` and enforces access.

Middleware
- checkRole(allowedRoles) middleware is implemented in `index.js`.
  - Usage examples:
    - requireAdminOrSuper -> `checkRole(['admin','superadmin'])`
    - requireSuper -> `checkRole(['superadmin'])`
    - requireAuth -> `checkRole(['any'])` (any authenticated user)

Rules enforced
- Delete operations -> superadmin only
- Add / Update -> admin + superadmin
- List / View -> any authenticated user

How to call (example cURL)
- Replace <ACCESS_TOKEN> with the Supabase access token from client sign-in.

View members (any authenticated user):
```
curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
  https://<your-backend>/getmembers
```

Add member (admin/superadmin):
```
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"name":"Ali","designation":"CEO","email":"a@b.com","phone":"123","company_address":"X","image":"data:image/jpeg;base64,..."}' \
  https://<your-backend>/add-member
```

Delete member (superadmin only):
```
curl -X DELETE -H "Authorization: Bearer <ACCESS_TOKEN>" \
  https://<your-backend>/delete-member/123
```

Notes
- The backend uses `supabase.auth.getUser(token)` to validate the token and fetch the user id; make sure the token sent by the frontend is the access token returned by Supabase after sign-in.
- If you want to allow public listing of some resources, we can change the route to be public (remove `requireAuth`).
