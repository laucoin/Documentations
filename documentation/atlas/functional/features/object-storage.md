# Object Storage

An S3-compatible layer with two very different tenants: the node's own encrypted backups, and — once enabled — a friend's replica. It is built as a two-node cluster from the first day even though only one node exists.

## Behaviour rules

1. **Not published.** The storage endpoint is reachable only from inside the node. Nothing about it faces the internet.
2. **Backups and applications never share a credential.** The backup repository has its own bucket and its own key, held only by the host. Each hosted application that needs object storage gets a separate bucket and key. **No application ever holds the backup key.**
3. **Every tenancy is capped.** Each bucket has a quota. Neither an application nor the peer can consume space beyond its allowance.
4. **The peer is mutual and private.** Atlas holds a replica of the peer's data and the peer holds a replica of Atlas's, at no cost to either. Replication travels over a private link between the two networks and never the open internet.
5. **The peer reaches nothing else.** Their tenancy is isolated: no access to Atlas's backups, its applications, or anything else on the node.
6. **Designed now, enabled later.** Layout, zones, replication settings and quotas are correct for two nodes from the beginning, so bringing the peer online is a configuration change rather than a migration.
7. **Until then, there is one copy.** This is stated plainly wherever it matters, and it is the largest open risk in Atlas.

## Scenarios

```gherkin
Feature: Object storage

  Scenario: Reaching it from outside
    When a client on the internet attempts to reach the storage endpoint
    Then the connection is refused

  Scenario: An application exceeds its quota
    Given an application has filled its allowance
    When it writes again
    Then the write is refused
    And no other tenant is affected

  Scenario: An application attempts to reach the backup bucket
    Given an application holds its own storage credential
    When it attempts to read the backup bucket
    Then it is refused

  Scenario: The peer comes online
    Given the peer's node is reachable over the private link
    When it joins the cluster
    Then existing data is replicated to it
    And no data has to be moved or re-uploaded first

  Scenario: The peer's allowance is exhausted
    Given the peer has filled their quota
    When they write again
    Then the write is refused
    And Atlas's own storage is unaffected
```

## Permissions

| Action | `admin` | `household` | `collaborator` | Peer | Application |
| ------ | ------- | ----------- | -------------- | ---- | ----------- |
| Administer the cluster | Yes | No | No | No | No |
| Read or write the backup bucket | Through the backup job only | No | No | No | No |
| Read or write an application bucket | Yes | No | No | No | Its own only |
| Read or write the peer tenancy | No | No | No | Yes, up to quota | No |

## Accepted risks

- **One copy until the peer is live.** Every event that destroys the drive destroys the backups with it. This is the single most important gap in Atlas and closing it is the highest-value work after the first build.
