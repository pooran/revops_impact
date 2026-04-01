# MEDDICC Scoring — RevOps Impact

A production-ready implementation of MEDDICC deal qualification scoring for both **Salesforce** and **HubSpot**. Built to accompany the RevOps Impact article: [How to build MEDDICC scoring using Claude Code](https://revopsimpact.com).

## What's in this repo

```
├── force-app/main/default/          # Salesforce DX implementation
│   ├── objects/Opportunity/
│   │   ├── fields/                  # 14 custom fields + composite score
│   │   └── validationRules/         # 2 stage gate rules
│   ├── classes/                     # Apex scoring handler + test class
│   └── triggers/                    # MEDDICCScoring trigger
├── hubspot-app/                     # HubSpot implementation
│   ├── config/
│   │   └── custom-properties.json   # 15 deal property definitions
│   ├── scripts/
│   │   └── provision-properties.js  # Creates properties via HubSpot API
│   ├── src/scoring/
│   │   ├── meddiccScoringHandler.js # Scoring logic + stage gates
│   │   ├── workflowAction.js        # HubSpot custom coded action
│   │   └── __tests__/               # Jest test suite
│   └── package.json
├── manifest/
│   └── package.xml                  # Salesforce deployment manifest
├── config/
│   └── project-scratch-def.json     # Salesforce scratch org definition
└── CLAUDE.md                        # Project context for Claude Code
```

## Prerequisites

### For HubSpot
- [Node.js](https://nodejs.org) >= 18
- - A HubSpot account with Operations Hub Professional (for custom coded actions)
  - - A [HubSpot private app](https://developers.hubspot.com/docs/api/private-apps) access token with Deals read/write scope
   
    - ### For Salesforce
    - - [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) installed
      - - A Salesforce sandbox org with Dev Hub enabled
       
        - ### Common
        - - [Claude Code](https://claude.ai/code) installed
          - - A GitHub account
           
            - ---

            ## HubSpot Setup

            ### 1. Fork and clone this repo

            ```bash
            git clone https://github.com/your-org/revops_impact.git
            cd revops_impact/hubspot-app
            npm install
            ```

            ### 2. Provision custom properties

            Create a [HubSpot private app](https://app.hubspot.com/private-apps/) with CRM Deals read/write scopes, then run:

            ```bash
            HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxx npm run provision
            ```

            This creates the `meddicc_scoring` property group and all 15 deal properties in your HubSpot portal.

            ### 3. Create the scoring workflow

            In HubSpot, go to **Automation > Workflows** and create a deal-based workflow:

            1. **Trigger:** Any of the 7 MEDDICC score properties is known / has changed.
            2. 2. **Action:** Add a "Custom code" action.
               3. 3. Paste the contents of `hubspot-app/src/scoring/workflowAction.js`.
                  4. 4. Under **Properties to include in code**, add: `meddicc_metrics_score`, `meddicc_economic_buyer_score`, `meddicc_decision_criteria_score`, `meddicc_decision_process_score`, `meddicc_identified_pain_score`, `meddicc_champion_score`, `meddicc_competition_score`, `meddicc_composite_score`, `dealstage`.
                     5. 5. Under **Secrets**, add `HUBSPOT_SECRET_KEY` with your private app access token.
                        6. 6. Turn on the workflow.
                          
                           7. ### 4. Create the stage gate workflow (optional)
                          
                           8. Create a second deal-based workflow triggered on `dealstage` change. Use the `gate_allowed` and `gate_message` output fields from the scoring action to branch: if `gate_allowed` is false, revert the deal stage or notify the rep.
                          
                           9. ### 5. Run tests
                          
                           10. ```bash
                               cd hubspot-app
                               npm test
                               ```

                               ---

                               ## Scoring model

                               Each MEDDICC element is rated 1–5. The composite score (0–100) is calculated by the scoring handler using these weights:

                               | Element            | Weight |
                               |--------------------|--------|
                               | Champion           | 20%    |
                               | Economic Buyer     | 20%    |
                               | Metrics            | 15%    |
                               | Identified Pain    | 15%    |
                               | Decision Criteria  | 12%    |
                               | Decision Process   | 12%    |
                               | Competition        |  6%    |

                               ## Stage gates

                               | Gate                                  | Condition                                                    |
                               |---------------------------------------|--------------------------------------------------------------|
                               | Discovery → Solution Alignment        | Metrics and Identified Pain scores must be populated         |
                               | Solution Alignment → Negotiation      | All 7 scores populated + Composite Score ≥ 65                |

                               ## Extending the model

                               See `CLAUDE.md` for instructions on extending to MEDDPICC (Paper Process), adjusting weights, or adding additional stage gates.

                               ---

                               ## Salesforce Setup

                               See the `force-app/` directory. The original Salesforce DX setup instructions:

                               ```bash
                               sf org login web --alias meddicc-sandbox
                               sf project deploy start \
                                 --manifest manifest/package.xml \
                                 --target-org meddicc-sandbox \
                                 --test-level RunLocalTests \
                                 --wait 30
                               ```

                               ---

                               ## License

                               MIT. Free to use, fork, and adapt. Attribution to [RevOps Impact](https://revopsimpact.com) appreciated but not required.
