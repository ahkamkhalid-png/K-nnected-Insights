# Recovering legacy editorial images and staff access

**Portable transfer (2026-11-19):** The owner separately requested a one-time, unencrypted copy of available website data in the existing private GitHub repository. See the [portable website instructions](../scripts/portable/README.md). Earlier approval and test records below describe the separate encrypted backup procedure, not this transfer.

A database restore alone covers neither dependency. Treat the Drive archive as a
**separate recovery unit**, never as input to `pg_restore`. Identity recovery is
re-enrollment or verified relinking, not a credential export.

## Read-only inventory receipt (2026-11-19, task workspace)

| Checked source | Observed | Limit |
| --- | --- | --- |
| Drive, existing connector, tagged-file listing including shared files | Two non-trashed PNGs: generated artwork 1,899,811 bytes; private evidence 429,400 bytes. Both have a provider SHA-256. No tagged trashed files returned; no incomplete-search flag. | Only files and private appProperties visible to this connector, not an account-wide backup. A listing/checksum is not a byte backup. |
| Managed development PostgreSQL | Scanned text, JSON and array columns in 19 non-staff, non-binary-asset public tables for stored `…/drive/ID` and generated routes. One public-route reference and one generated reference, both matched database asset UUIDs. No unmatched candidate. | Excludes arbitrary third-party URLs, inaccessible files, unrecognized encodings, transient inputs and files never referenced by a saved row. Do not discard apparently unused tagged evidence. |
| Development staff authorization | One owner row, linked; no other staff rows. | Not a Clerk user count or a production roster. No emails, provider IDs or invitation claims exported. |
| Provider | Replit-managed Clerk; configured owner email and Clerk frontend/backend key dependencies in app configuration. | Production tenant settings and users not inspected. Production managed DB query reported no production database; do not infer that the published app has no staff or legacy references. Confirm its actual data source separately. |

Drive inventory fingerprint: `7aad22c9ed4f7ebd5dd1da4a276a9312289f4269562ce3acade44c80cc50f4f2`.
This binds the ordered original IDs, exact marker and purpose, MIME, byte sizes,
trash flags and provider hashes without publishing the IDs. It is not a key or
an archive. On repeat, reconcile stored URLs against **actual** DB asset rows;
a UUID with no corresponding row can fall through to Drive. For each unmatched
ID require a matching Drive object/purpose, or record a missing dependency. A
nonempty difference, incomplete listing, changed fingerprint or unconfirmed
source must not be signed off as a complete recovery point.

## Operator procedure: Drive

1. Inventory without fetching content: `node artifacts/api-server/scripts/recovery/legacy-drive.mjs inventory`.
   Reconcile the counts, expected source account, purposes and fingerprint.
   Obtain explicit approval for this set (including evidence), destination,
   key holder, authorized readers, isolated drill and retention. Never broaden
   the query to all Drive files or change original file permissions.
2. On an approved host use the independently retained `RECOVERY_BACKUP_PASSPHRASE`
   from the secure environment. Create a private 0700 directory outside the
   checkout, on restricted encrypted storage. Example (substitute approved fingerprint):

   ```sh
   umask 077
   node artifacts/api-server/scripts/recovery/legacy-drive.mjs capture-approved APPROVED_FINGERPRINT /private/recovery/drive.knrb
   ```

   GET-only capture verifies every byte length and Drive SHA-256, repeats the
   metadata listing, then encrypts original IDs, purpose appProperties, MIME,
   sizes, hashes and content together. No names, owner identities, ACLs,
   public links or credentials are needed. Fail closed on drift, unknown purpose,
   missing SHA-256, duplicate IDs, a file over 10 MiB, more than 1,000 files or
   more than 32 MiB total; escalate rather than silently truncating. No upload
   or application change occurs. Keep the approved encrypted unit distinct from
   a DB dump, even if both use KNRB encryption. Record the unit type, retrieval
   location, digest, corresponding DB snapshot and operator approval privately.
3. After retrieving the stored ciphertext, follow [authenticated decryption](backup-decryption.md)
   into a private file, then verify it offline (no Drive/Clerk connection):

   ```sh
   node scripts/recovery-decrypt.mjs --input /private/recovery/drive.knrb --output /private/recovery/drive.json
   node artifacts/api-server/scripts/recovery/legacy-drive.mjs verify /private/recovery/drive.json
   ```

   Compare the reported fingerprint with the separately approved fingerprint.
   The JSON contains **private bytes and IDs**, not a shareable manifest. The
   recovery reader builds an original-ID→metadata/bytes map and rejects size,
   digest, purpose and inventory mismatches. The isolated drill below serves
   this mapping via the real application storage routes, without a Drive grant.
   A production replacement backend or URL migration is a separate cutover:
   privately map each original ID to a new ID, match purpose/MIME/size/hash,
   reconcile every stored reference, retain rollback, then obtain approval.
   A copied file with a different ID is not a recovered URL. Do not leave an
   anonymous mirror, relax evidence authorization, or repurpose the drill as a server.
4. Remove decrypted JSON, staged bytes, temporary DB and any fixture environment
   promptly; never attach them to chat, commits or logs. Custodian controls
   encrypted copies and retention. No known real-byte recovery receipt yet.

## Provider and access recovery runbook

- Have the owner/custodian record **non-secret settings** in their restricted
  incident inventory: verified tenant/environment, domains/proxy path, allowed
  origins and redirect URLs, sign-in factors/verification and sign-up policy,
  MFA/session lifetime, social connections, email configuration and webhook
  destinations/events if configured. Record enabled/disabled/unknown explicitly.
  Record who can regain provider administration and DNS/mailbox control via
  independently held recovery channels; do not store recovery codes with this
  inventory. App source is not authoritative for tenant dashboard settings.
- Recover the original provider tenant through its authorized administrator if
  possible. Privately reconcile current provider membership, suspensions and
  revocations with the owner; an older staff snapshot is not authoritative.
  For same-tenant recovery verify linked IDs **and** verified email and role.
  Never transfer sessions, signing secrets, passwords/hashes, MFA seeds,
  invitation links/claim tokens or OAuth grants. Reissue keys/grants via secure
  setup; require fresh sign-in/MFA. Do not print a user/claim dump.
- For a replacement tenant start closed with an **empty active staff roster**
  on the isolated target. Keep historical authorship/audits as attribution,
  not permissions. Configure a verified, owner-controlled mailbox using
  `EDITORIAL_OWNER_EMAIL`. Only that verified owner may bootstrap. Issue fresh
  individual admin/editor invitations **after** the owner approves each role.
  Do not import pending invites, grant by email alone, map stale IDs automatically
  or re-enable removed staff. Staff acceptance needs the new provider invite,
  verified email, valid expiry and matching claim metadata. Revocations must
  take effect on the next protected request. Preserve historical-to-new staff
  identifiers only as restricted audit data, never as a login mechanism.
- In an approved **separate** test tenant use only synthetic mailboxes and a
  mail sink; no production frontend/backend keys, proxy targets, live OAuth,
  webhook or mail destinations, workers or paid AI. Verify account creation,
  sign-in, email verification, invitation acceptance, owner/admin/editor and
  denied access with the intended factors. If no separate tenant is available,
  record provider-level verification as outstanding; the fixture below tests
  app authorization, **not** provider login, delivery or dashboard settings.
- Require explicit owner approval before changing live DNS, provider config,
  identity links, old invitations, roles or workers. Agree rollback and keep
  the previous service recoverable. Never point a drill clone at live Clerk.

## Repeatable isolated verification

```sh
node artifacts/api-server/scripts/recovery/drill.mjs
```

Passed: fresh PostgreSQL cluster (private Unix socket only), loopback HTTP,
synthetic source and restored original-ID mirror, test-only Clerk/Drive aliases,
child environment built from scratch, no normal app startup or workers.
Verified encrypted capture → decryption → byte-for-byte public/generated/staff
reads, private evidence caching and public-route denials; owner bootstrap,
fresh admin/editor invitation claims, stale linked subject and expired invite
denial, immediate revocation and unsigned access denial. The runner removes
its temp directory and stops the cluster. After forced termination inspect only
the identified `external-recovery-*` directory on the drill host. Synthetic
success is not a production restore, provider re-enrollment or real-media backup.
