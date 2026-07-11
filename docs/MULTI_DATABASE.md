# Multi-database architecture

Each school gets its own PostgreSQL database. A small **catalog** database tracks registered schools.

## Databases

| Database | Purpose |
|----------|---------|
| `school_catalog` | School registry (`id`, `name`, `databaseName`, `status`) |
| `sms_<schoolId>` | Full relational schema for one school |

Example:

```
school_catalog
├── School: Quaid-e-Azam → sms_school_1783689051336
└── School: Lahore Academy → sms_school_2947123456789

sms_school_1783689051336
├── User, StudentProfile, StaffProfile, Invoice, ...
└── AppStorage (temporary bridge while domains move off key/value storage)

sms_school_2947123456789
└── separate copy of the same schema
```

## Environment variables

```env
CATALOG_DATABASE_URL=postgresql://schoolapp:pass@localhost:5432/school_catalog
POSTGRES_ADMIN_URL=postgresql://postgres:pass@localhost:5432/postgres
USE_DATABASE=true
NEXT_PUBLIC_USE_DATABASE=true
```

`POSTGRES_ADMIN_URL` must be able to `CREATE DATABASE` and `DROP DATABASE`.

Grant on the VPS:

```sql
ALTER USER schoolapp CREATEDB;
```

## New school signup

1. Insert school row in `school_catalog` with status `provisioning`
2. `CREATE DATABASE sms_<schoolId>`
3. `prisma db push` tenant schema into that database
4. Mark school `active`

## Deploy after pulling updates

```bash
cd /var/www/school-management-system
git pull origin master
npm ci
npm run db:generate
npm run db:deploy
npm run db:deploy:tenants
npm run build
pm2 restart school-app
```

## Migrate existing single-database deployment

If you still have the old `school_management` database with `School` + `TenantStorage`:

```bash
export LEGACY_DATABASE_URL=postgresql://schoolapp:pass@localhost:5432/school_management
export CATALOG_DATABASE_URL=postgresql://schoolapp:pass@localhost:5432/school_catalog
export POSTGRES_ADMIN_URL=postgresql://postgres:pass@localhost:5432/postgres
npm run db:migrate:legacy
```

Then update `.env` to use `CATALOG_DATABASE_URL` and restart the app.

## Browse a school's database

```bash
TENANT_DATABASE_URL=postgresql://schoolapp:pass@localhost:5432/sms_school_1783689051336 \
  npx prisma studio --schema prisma/tenant/schema.prisma
```

## Per-school backup

```bash
pg_dump -d sms_school_1783689051336 > qaaps_backup.sql
```

Admins can also schedule backups in **Admin → Settings → System Security**:

- Daily / Weekly / Monthly / Yearly
- Create backup now
- Download latest `.sql.gz` backup from the server

Run scheduled backups for all schools (add to cron hourly):

```bash
cd /var/www/school-management-system
npm run db:backups:run
```

Example cron:

```bash
0 * * * * cd /var/www/school-management-system && /usr/bin/npm run db:backups:run >> /var/log/school-backups.log 2>&1
```

## Restore one school

```bash
createdb sms_school_1783689051336
psql -d sms_school_1783689051336 < qaaps_backup.sql
```
