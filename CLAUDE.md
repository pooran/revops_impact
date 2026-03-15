# MEDDICC Salesforce Scoring — Claude Code Project Context

This file is read by Claude Code at the start of each session. It captures the
decisions, conventions, and logic behind this implementation so that extensions
and changes are consistent with the original build.

---

## What this repo does

This project implements MEDDICC deal qualification scoring on the Salesforce
Opportunity object. It includes:

- 14 custom fields (7 long text notes + 7 scored picklists, one per MEDDICC element)
- 1 composite score field (Number, 0–100) calculated by an Apex trigger handler
- 2 stage gate validation rules enforcing minimum qualification before stage advancement
- A bulkified Apex trigger handler (MEDDICCScoringHandler) and full test coverage
- GitHub Actions workflows for sandbox validation on PR and production deployment on release

---

## Scoring model

Each MEDDICC element is rated on a 1–5 picklist scale:
  1 = Not identified
  2 = Partially understood
  3 = Understood
  4 = Confirmed
  5 = Fully confirmed and documented

The composite score (MEDDICC_Composite_Score__c) is calculated as:

  SUM(score_i × weight_i) / 5

This normalizes the weighted sum to a 0–100 scale.

### Weights

| Element           | Weight |
|-------------------|--------|
| Champion          | 20%    |
| Economic Buyer    | 20%    |
| Metrics           | 15%    |
| Identified Pain   | 15%    |
| Decision Criteria | 12%    |
| Decision Process  | 12%    |
| Competition       |  6%    |
| **Total**         | **100%** |

Champion and Economic Buyer are weighted highest because access to these
stakeholders is the strongest predictor of deal progression in complex sales.

---

## Stage gate rules

Two validation rules enforce minimum qualification before stage advancement:

1. **Discovery → Solution Alignment**
   Requires: MEDDICC_Metrics_Score__c and MEDDICC_Identified_Pain_Score__c must be populated.
   Rationale: Confirm the business problem and success metric before proposing a solution.

2. **Solution Alignment → Negotiation/Review**
   Requires: All seven score fields populated AND MEDDICC_Composite_Score__c ≥ 65.
   Rationale: A composite of 65 requires average scores of ~3.25 across weighted elements,
   representing a deal that is understood and progressing, not merely touched.

---

## Naming conventions

- Field API names: `MEDDICC_[Element]_Notes__c` and `MEDDICC_[Element]_Score__c`
- Apex class: `MEDDICCScoringHandler` (handler) + `MEDDICCScoringHandlerTest` (tests)
- Trigger: `MEDDICCScoring` (thin — delegates all logic to the handler class)
- Validation rules: `MEDDICC_[From]_to_[To]_Gate`

---

## Apex conventions

- The trigger (MEDDICCScoring.trigger) contains no logic — it only calls the handler.
- MEDDICCScoringHandler is `with sharing` and handles bulk operations.
- Score fields are read via `opp.get(fieldName)` using the WEIGHT_MAP keys to keep
  the calculation loop DRY. Adding a new element means adding one entry to WEIGHT_MAP.
- Picklist values are stored as strings ('1'–'5'). Null or blank values contribute 0.

---

## Extending to MEDDPICC

To add Paper Process (P):
1. Create MEDDICC_Paper_Process_Notes__c and MEDDICC_Paper_Process_Score__c fields.
2. Add 'MEDDICC_Paper_Process_Score__c' to the WEIGHT_MAP in MEDDICCScoringHandler.
3. Reduce other weights proportionally so the total remains 100.
4. Add the new fields to package.xml.
5. Update the MEDDICC_Solution_to_Negotiation_Gate validation rule to include the new field.
6. Add test cases to MEDDICCScoringHandlerTest covering the new element.

---

## GitHub secrets required

| Secret name               | Value                                          |
|---------------------------|------------------------------------------------|
| SFDX_AUTH_URL_SANDBOX     | Output of `sf org display --verbose` for sandbox |
| SFDX_AUTH_URL_PRODUCTION  | Output of `sf org display --verbose` for production |

Retrieve with: `sf org display --verbose --target-org <alias>`
Copy the `Sfdx Auth Url` value and store it as a repository secret.

---

## Branching strategy

- `main` — production state. Only merged via PR after validation passes.
- Feature branches — all development work. Named `feature/[description]`.
- PRs against `main` trigger the validation workflow automatically.
- Production deployments trigger on GitHub Release publish.

---

## What Claude Code should know

When generating new metadata for this project:
- Always follow the naming conventions above.
- Always include a description attribute on custom fields.
- Apex classes must use `with sharing` and handle 200+ record batches.
- New score fields must be added to WEIGHT_MAP in MEDDICCScoringHandler.
- New validation rules must be added to package.xml before deployment.
- Test classes must cover both positive (allowed) and negative (blocked) scenarios
  for any new validation rule.
