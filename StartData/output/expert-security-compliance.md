# Security & Compliance Analysis — Gamer Wellness

## 1. Data Classification (LOPDP)

| Category | Examples | LOPDP Class | Handling |
|----------|----------|-------------|----------|
| Health / wellness | Self-reported conditions, wearable metrics, mental health scores | **Sensitive** (Art. 25) | Explicit consent, DPIA mandatory, encrypted at rest + transit |
| Behavioral / gaming | Play hours, game preferences, event attendance | Personal | Legitimate interest or consent, pseudonymize for B2B |
| Identity | Name, email, Discord ID, device IDs | Personal | Minimize collection, hash where possible |
| Minors (under 18) | All of the above | **Sensitive + additional** (Art. 24) | Parental consent mandatory, best-interest principle |
| Aggregated / anonymized | Cohort-level stats sold to B2B | Non-personal (if truly anonymous) | k-anonymity >= 50 for small Ecuador population; if re-identifiable, full LOPDP applies |
| Financial | Payment info, membership billing | Personal | PCI-DSS scope, delegate to Stripe/processor |

**Key risk**: Ecuador's gamer population is small enough that "anonymized" behavioral+health data can be re-identified. Treat all B2B exports as personal data unless proven otherwise via formal anonymization assessment.

---

## 2. Top 10 Threats & Mitigations

| # | Threat | Severity | Mitigation |
|---|--------|----------|------------|
| T1 | LOPDP enforcement (SPDP fined LigaPro $259K, FEF $195K in Jan 2026 for a FAN ID app — directly analogous) | **Critical** | DPO + DPIA before launch, SPDP registration, granular consent |
| T2 | Health data breach (10-50x black market value vs financial data) | **Critical** | RLS per user, AES-256 at rest, TLS 1.3, field-level encryption on health columns |
| T3 | Discord TOS violation triggers bot ban + community loss | **Critical** | Strict architectural separation: Discord = community only, zero data collection, quarterly audit |
| T4 | B2B partner misuse (insurer cross-references cohort data to discriminate) | **High** | Aggregate-only exports, contractual anti-discrimination clauses, audit rights |
| T5 | Consent revocation not propagated to B2B exports | **High** | Immutable consent ledger, 72h propagation SLA, revocation clause in all B2B contracts |
| T6 | Mental health crisis data leaks into analytics pipeline | **High** | Separate crisis data from analytics entirely, auto-purge after referral, never export to B2B |
| T7 | API abuse / injection (NestJS backend) | **High** | class-validator, parameterized queries, rate limiting, WAF, OWASP top-10 hardening |
| T8 | Re-identification of "anonymized" data in small populations | **High** | k-anonymity >= 50, formal anonymization assessment, treat as personal data by default |
| T9 | Supply chain compromise (Open Wearables, gengine, Supabase deps) | **Medium** | Dependabot + Snyk, lockfile audits, pin versions, review MIT deps quarterly |
| T10 | Cross-border data transfer on LATAM expansion | **High** | Data residency in Ecuador, SCCs per country, per-market consent addenda (Colombia: explicit auth, Mexico: express written, Peru: neurodata rules) |

---

## 3. LOPDP Compliance Checklist

| # | Requirement | Action | Deadline |
|---|-------------|--------|----------|
| 1 | **DPO appointment** (Art. 46) | Hire/contract DPO with Ecuador data law expertise | Before any data collection |
| 2 | **DPIA** (Art. 42) | Conduct for: health data processing, B2B sharing, wearable integration | Before MVP launch |
| 3 | **SPDP registration** | Register all processing activities with Superintendencia | Before launch |
| 4 | **Granular consent** | Per-purpose toggles: (a) community profile, (b) health data, (c) each B2B category, (d) cross-border. Each independently revocable | Build in Phase 1 |
| 5 | **Breach notification** | SPDP within 72h, users without undue delay. Prepare IR playbook + template | Before launch |
| 6 | **Data subject rights** (access, rectification, erasure, portability) | Self-service portal in app + manual fallback. 15-day response SLA | Build in Phase 1 |
| 7 | **Minors** (Art. 24) | Parental consent flow, age verification, best-interest review | Before launch |
| 8 | **Data minimization + retention** | Define retention per category, auto-delete health data after purpose fulfilled | Before launch |
| 9 | **Lawful basis mapping** | Document legal basis for every processing activity | Before launch |
| 10 | **Expansion readiness** | Legal review per market before entry | Before each new market |

**Precedent warning**: SPDP penalties include 0.1-1% of turnover + activity suspension + mandatory data deletion. Health data processing triggers the highest penalty tier.

---

## 4. Key Security Requirements (Must-Haves)

**Authentication & Authorization**
- Supabase Auth with MFA for admin/DPO/B2B dashboard users
- Row-Level Security (RLS) on ALL tables with personal/health data
- RBAC minimum roles: `user`, `moderator`, `admin`, `dpo`, `b2b_viewer`
- OAuth 2.0 PKCE for Discord Account Linking and mobile app

**Encryption**
- TLS 1.3 all API traffic; AES-256 at rest (Supabase default + field-level for health columns)
- Certificate pinning in React Native app

**Consent Engine**
- Immutable, timestamped, versioned consent ledger
- Machine-readable consent status queried before every data processing operation
- Re-consent required on policy version changes

**B2B Data Pipeline**
- All exports aggregated + k-anonymized (k >= 50); no raw individual records leave the platform
- Audit log of every export (who, what, when, purpose)
- Contractual: partner deletes data within 30 days of contract termination

**Infrastructure**
- Supabase self-hosted or single-region (Ecuador/nearest) for data residency
- Automated vuln scanning (Dependabot + Snyk); pen test before launch, annually thereafter
- Encrypted backups with tested restore; quarterly IR tabletop exercises

---

## 5. Discord TOS — Architectural Separation (Mandatory)

Discord Developer Policy prohibits disclosing API Data to "data brokers, advertising networks, or monetization-related services."

```
DISCORD (community only)              PLATFORM (data + monetization)
├── Chat / voice channels              ├── Web app + React Native app
├── Event announcements                ├── Health data collection
├── Bot: info only (tips, links)       ├── Consent management
│                                      ├── Wearable integration
│   ── Discord Account Linking ──>     ├── B2B data pipeline
│      (identity bridge ONLY:          ├── Analytics (PostHog)
│       maps Discord ID to user ID,    └── Metabase dashboards
│       no content/activity crosses)
```

**Hard rules**:
1. Discord bot collects **zero data** — informational output only (reminders, tips, links to app)
2. No health surveys, forms, or data collection in Discord — always redirect to app
3. No Discord message content stored or analyzed, ever
4. Account Linking maps identity only; platform never writes data back to Discord
5. Discord Activities API: all generated data stays on platform backend, outside Discord scope
6. **Quarterly audit**: verify no Discord API data enters the B2B pipeline
