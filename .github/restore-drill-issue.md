# Monthly Firestore restore drill

Please run our restore drill to validate backups are restorable.

Checklist

- [ ] Find latest export in gs://kcm-firebase-b7d6a-backups/firestore-exports/kcm-db/
- [ ] Create temp DB (kcm-restore)
- [ ] Import using scripts/restore_drill.sh and wait for SUCCESSFUL
- [ ] Spot-check a couple collections
- [ ] Disable delete protection and delete kcm-restore
- [ ] Paste operation ID and timing below

Notes

- Runbook: docs/ops/README.md
- Script: scripts/restore_drill.sh

Outcome

- Operation:
- Start/End:
- Issues:
