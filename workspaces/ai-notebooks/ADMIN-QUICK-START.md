# AI Notebooks - Admin Quick Start (5 Minutes)

## Understanding the Permission Model

**AI Notebooks uses FEATURE-LEVEL access control:**

- ✅ **Users either have access OR they don't** (simple binary permission)
- ✅ **If they have access, they can use ALL features** (create, read, update, delete, manage docs)
- ✅ **Users only see their OWN sessions** (data isolation via application logic)

**No complex roles needed!** Just: "Do you have access to AI Notebooks? Yes or No."

---

## Step 1: Enable Permissions (2 minutes)

Edit your `app-config.yaml`:

```yaml
permission:
  enabled: true
  rbac:
    policies-csv-file: ./rbac-policy.csv
    policyFileReload: true
```

## Step 2: Create RBAC Policy File (2 minutes)

Create `rbac-policy.csv` next to your `app-config.yaml`:

```csv
# Give users/groups access to AI Notebooks feature
p, role:default/ai-notebooks-users, ai.notebooks.use, update, allow

# Assign your users (CHANGE THESE!)
g, user:default/YOUR_USERNAME, role:default/ai-notebooks-users
g, group:default/YOUR_TEAM_NAME, role:default/ai-notebooks-users
```

**That's it!** Simple binary permission: have access or don't.

## Step 3: Restart RHDH (1 minute)

```bash
# Kubernetes/OpenShift
kubectl rollout restart deployment/backstage -n rhdh

# Docker
docker restart rhdh
```

## Done! 🎉

Your users can now:
- **Users with access**: Full access to AI Notebooks (create, view, update, delete their own sessions)
- **Users without access**: Cannot use AI Notebooks at all

---

## Data Isolation (Automatic!)

**Users automatically see only their OWN sessions:**

- Alice creates: `session-user-default-alice-123456-abc`
- Bob creates: `session-user-default-bob-789012-def`
- Alice **cannot** see Bob's sessions (application enforces ownership)
- Bob **cannot** see Alice's sessions (application enforces ownership)

**No complex permission rules needed!** The application handles data isolation.

---

## Quick Test

```bash
# Try creating a session
curl -X POST http://localhost:7007/api/ai-notebooks/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Session"}'

# If you get 403 Forbidden - you don't have access ❌
# If you get 200 OK - you have access ✅
```

---

## Common Tasks

### Add a New User

Edit `rbac-policy.csv`, add:
```csv
g, user:default/newuser, role:default/ai-notebooks-users
```

### Add a Whole Team

```csv
g, group:default/engineering-team, role:default/ai-notebooks-users
```

### Remove Someone's Access

Delete their line from `rbac-policy.csv` and save.

---

## Permission Matrix

| User Type | Access to Feature | Can See Others' Sessions |
|-----------|------------------|-------------------------|
| **No Permission** | ❌ Cannot use feature | N/A |
| **Has Permission** | ✅ Full access (create, read, update, delete) | ❌ Only their own |

**Simple!** Either you're in or you're out. No tiers, no roles, no complexity.

---

## Need More Details?

Read `ADMIN-SETUP-GUIDE.md` for:
- Troubleshooting
- Advanced scenarios
- Testing procedures
- Best practices
