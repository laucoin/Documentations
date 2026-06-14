# ADR 007 — local-path-provisioner + Restic for storage and backup

## Status

Accepted

## Context

Atlas runs on a single node ([ADR 002](./002-talos-vs-k3s-debian)). Workloads need persistent storage (Harbor blobs, Postgres databases for Authentik / Infisical / Harbor, Grafana state, Prometheus and Loki TSDBs), and the operator needs the data to survive disk and host failures.

The options considered were:

1. **local-path-provisioner** (Rancher) — a simple CSI driver that provisions `hostPath`-backed PersistentVolumes on demand.
2. **Longhorn** — replicated block storage. Built for HA across nodes. Snapshots and backups built in.
3. **OpenEBS LocalPV + Velero** — local volumes plus Velero for snapshots.
4. **Manual `hostPath`** PVs — no CSI, no provisioner.

For backup:

1. **Restic / Kopia** to an external S3-compatible bucket (Backblaze B2, MinIO elsewhere, Hetzner Object Storage).
2. **Velero** for full cluster manifests + PV snapshots.
3. **No backup**, accepting data loss on disk failure.

The cluster has one node and one disk. Replicated volumes solve a problem (node-loss) that does not exist here. Backups, on the other hand, solve disk-loss and operator-error, which absolutely do.

## Decision

Use **local-path-provisioner** as the default StorageClass, and **Restic** in a CronJob to back up the on-disk volumes to an external S3-compatible bucket.

## Consequences

### Positive

- **Lowest-overhead storage on a single node.** A PVC becomes a directory under `/var/mnt/local-path-provisioner/`. No replication tax, no extra controllers, no extra RAM.
- **Restic is the right shape for the problem**: encrypted, deduplicated, incremental snapshots to S3. Restoring is `restic restore <snapshot> --target ./`.
- **Off-site backup decouples backup failure modes** from cluster failure modes. Losing the node does not lose the backups.
- **Postgres dumps are part of the same backup job** — Restic snapshots both the volume contents and a SQL dump produced by a pre-backup hook, so restores are consistent.
- **Backup verification is scriptable.** A periodic CronJob runs `restic check` and reports to Alertmanager.

### Negative

- **No HA, no live replication.** A disk failure means downtime until the disk is replaced and the latest Restic snapshot is restored. Acceptable for a homelab; not acceptable for production. RPO is the last nightly backup; RTO is "how long it takes me to restore", typically an hour.
- **`hostPath`-style volumes are tied to the node.** They cannot be scheduled elsewhere. On a single-node cluster, this is a non-issue.
- **Restic snapshots are only as good as their target.** The S3 bucket must use immutable object versioning or a separate write-only key, otherwise a compromised cluster could delete its own backups.
- **Hot Postgres data should not be snapshotted at the block level.** The backup CronJob explicitly produces SQL dumps before snapshotting, avoiding inconsistent restores.

### Why not Longhorn

Longhorn is a great fit for a 3-node HA cluster with multiple disks. On a single node, it adds a replication layer that has nothing to replicate, costs hundreds of MB of RAM, and introduces a moving part (its own controller and engine pods per volume) that can break. Atlas pays no resource budget for a redundancy it cannot achieve.

### Why not Velero

Velero is excellent for full-cluster disaster recovery — manifests + PV snapshots — in environments where the underlying storage supports CSI snapshots. local-path-provisioner does not. Velero's restic-based plugin would work but duplicates the Restic-cronjob approach Atlas already runs, with more moving parts.
