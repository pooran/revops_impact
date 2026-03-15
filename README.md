# MEDDICC Scoring in Salesforce — RevOps Impact

A production-ready Salesforce DX project implementing MEDDICC deal qualification scoring on the Opportunity object. Built to accompany the RevOps Impact article: **How to build MEDDICC scoring in Salesforce using Claude Code**.

---

## What's in this repo

```
├── force-app/main/default/
│   ├── objects/Opportunity/
│   │   ├── fields/              # 14 custom fields + composite score
│   │   └── validationRules/     # 2 stage gate rules
│   ├── classes/                 # Apex scoring handler + test class
│   └── triggers/                # MEDDICCScoring trigger
├── manifest/
│   └── package.xml              # Deployment manifest
├── config/
│   └── project-scratch-def.json # Scratch org definition
├── .github/workflows/
│   ├── validate.yml             # Validates on PR against main
│   └── deploy.yml               # Deploys to production on Release
└── CLAUDE.md                    # Project context for Claude Code sessions
```

---

## Prerequisites

- [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) installed
- A Salesforce sandbox org with Dev Hub enabled
- [Claude Code](https://claude.ai/code) installed
- A GitHub account

---

## Setup

### 1. Fork this repo

Fork to your own GitHub account or organization. Clone it locally.

```bash
git clone https://github.com/your-org/meddicc-salesforce-claude.git
cd meddicc-salesforce-claude
```

### 2. Authenticate your Salesforce org

```bash
sf org login web --alias meddicc-sandbox
```

### 3. Add GitHub secrets for CI/CD

In your repository settings under **Secrets and variables → Actions**, add:

| Secret name               | How to get it                                         |
|---------------------------|-------------------------------------------------------|
| `SFDX_AUTH_URL_SANDBOX`   | `sf org display --verbose --target-org meddicc-sandbox` → copy `Sfdx Auth Url` |
| `SFDX_AUTH_URL_PRODUCTION`| Same command against your production org              |

### 4. Open in Claude Code

```bash
claude
```

Claude Code will read `CLAUDE.md` at session start. From here you can deploy the existing metadata, extend the scoring model, or add new stage gates using plain language prompts.

---

## Deploying to your sandbox

```bash
sf project deploy start \
  --manifest manifest/package.xml \
  --target-org meddicc-sandbox \
  --test-level RunLocalTests \
  --wait 30
```

---

## Scoring model

Each MEDDICC element is rated 1–5. The composite score (0–100) is calculated by the Apex trigger handler using these weights:

| Element           | Weight |
|-------------------|--------|
| Champion          | 20%    |
| Economic Buyer    | 20%    |
| Metrics           | 15%    |
| Identified Pain   | 15%    |
| Decision Criteria | 12%    |
| Decision Process  | 12%    |
| Competition       |  6%    |

---

## Stage gates

| Gate                                  | Condition                                                    |
|---------------------------------------|--------------------------------------------------------------|
| Discovery → Solution Alignment        | Metrics and Identified Pain scores must be populated         |
| Solution Alignment → Negotiation      | All 7 scores populated + Composite Score ≥ 65               |

---

## Extending the model

See `CLAUDE.md` for instructions on extending to MEDDPICC (Paper Process), adjusting weights, or adding additional stage gates. The project is structured so that Claude Code can make extensions from a plain language description without requiring you to touch the Apex or XML directly.

---

## CI/CD pipeline

- **On pull request to `main`:** Validates metadata against sandbox, runs all local Apex tests. Merge is blocked until validation passes.
- **On GitHub Release publish:** Deploys to production org with `RunLocalTests`.

---

## License

MIT. Free to use, fork, and adapt. Attribution to [RevOps Impact](https://revopsimpact.com) appreciated but not required.
