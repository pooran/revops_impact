# MEDDICC Scoring for HubSpot — Claude Code Project Context

This file is read by Claude Code at the start of each session. It captures the
decisions, conventions, and logic behind this implementation so that extensions
and changes are consistent with the original build.

---

## What this repo does

This project implements MEDDICC deal qualification scoring on HubSpot Deal records.
It includes both the original Salesforce implementation (in `force-app/`) and the
HubSpot adaptation (in `hubspot-app/`).

The HubSpot implementation includes:

- 15 custom deal properties (7 score selects, 7 notes textareas, 1 composite score number)
-   defined in `hubspot-app/config/custom-properties.json`
-   - A provisioning script (`hubspot-app/scripts/provision-properties.js`) that creates
    -   the property group and all properties via the HubSpot API
    -   - A scoring handler module (`hubspot-app/src/scoring/meddiccScoringHandler.js`) containing
        -   the composite score calculation, change detection, and stage gate validation logic
        -   - A HubSpot custom coded workflow action (`hubspot-app/src/scoring/workflowAction.js`)
            -   that integrates the scoring handler with HubSpot workflows
            -   - Jest tests (`hubspot-app/src/scoring/__tests__/`) covering scoring, change detection,
                -   and stage gate validation
             
                -   ---

                ## Scoring model

                Each MEDDICC element is rated on a 1-5 select scale:

                - 1 = Not identified
                - - 2 = Partially understood
                  - - 3 = Understood
                    - - 4 = Confirmed
                      - - 5 = Fully confirmed and documented
                       
                        - The composite score (`meddicc_composite_score`) is calculated as:
                       
                        -     SUM(score_i * weight_i) / 5
                       
                        - This normalizes the weighted sum to a 0-100 scale.
                       
                        - ### Weights
                       
                        - | Element            | Weight |
                        - |--------------------|--------|
                        - | Champion           | 20%    |
                        - | Economic Buyer     | 20%    |
                        - | Metrics            | 15%    |
                        - | Identified Pain    | 15%    |
                        - | Decision Criteria  | 12%    |
                        - | Decision Process   | 12%    |
                        - | Competition        |  6%    |
                        - | **Total**          | **100%** |
                       
                        - Champion and Economic Buyer are weighted highest because access to these
                        - stakeholders is the strongest predictor of deal progression in complex sales.
                       
                        - ---

                        ## Stage gate rules

                        Two stage gates enforce minimum qualification before deal stage advancement:

                        ### Discovery to Solution Alignment
                        - **Requires:** `meddicc_metrics_score` and `meddicc_identified_pain_score` must be populated.
                        - - **Rationale:** Confirm the business problem and success metric before proposing a solution.
                         
                          - ### Solution Alignment to Negotiation/Review
                          - - **Requires:** All seven score properties populated AND `meddicc_composite_score` >= 65.
                            - - **Rationale:** A composite of 65 requires average scores of ~3.25 across weighted elements.
                             
                              - ---

                              ## HubSpot property naming conventions

                              - Score properties: `meddicc_[element]_score` (enumeration/select)
                              - - Notes properties: `meddicc_[element]_notes` (string/textarea)
                                - - Composite score: `meddicc_composite_score` (number)
                                  - - Property group: `meddicc_scoring`
                                   
                                    - All properties are defined in `hubspot-app/config/custom-properties.json`.
                                   
                                    - ---

                                    ## HubSpot workflow setup

                                    1. **Scoring workflow:** Create a deal-based workflow triggered when any of the 7
                                    2.    MEDDICC score properties changes. Add a Custom Code action using the code from
                                    3.   `workflowAction.js`. Include all 7 score properties, `meddicc_composite_score`,
                                    4.      and `dealstage` as input properties. Set `HUBSPOT_SECRET_KEY` as a workflow secret.
                                   
                                    5.  2. **Stage gate workflow:** Create a separate deal-based workflow triggered on
                                        3.    `dealstage` change. Use workflow branches to check the `gate_allowed` output
                                        4.   from the scoring action. If `gate_allowed` is false, use a workflow action to
                                        5.      revert the deal stage or send a notification.
                                      
                                        6.  ---
                                      
                                        7.  ## Extending to MEDDPICC
                                      
                                        8.  To add Paper Process (P):
                                      
                                        9.  1. Add `meddicc_paper_process_notes` and `meddicc_paper_process_score` to `custom-properties.json`.
                                            2. 2. Add `meddicc_paper_process_score` to the `WEIGHT_MAP` in `meddiccScoringHandler.js`.
                                               3. 3. Reduce other weights proportionally so the total remains 100.
                                                  4. 4. Run `npm run provision` to create the new properties in HubSpot.
                                                     5. 5. Update the stage gate validation in `validateStageGate()` if the new field should be required.
                                                        6. 6. Add test cases to `meddiccScoringHandler.test.js` covering the new element.
                                                          
                                                           7. ---
                                                          
                                                           8. ## Environment variables
                                                          
                                                           9. | Variable              | Purpose                                          |
                                                           10. |-----------------------|--------------------------------------------------|
                                                           11. | `HUBSPOT_ACCESS_TOKEN`| Private app access token for provisioning script |
                                                           12. | `HUBSPOT_SECRET_KEY`  | Workflow secret for custom coded actions          |
                                                          
                                                           13. ---
                                                          
                                                           14. ## What Claude Code should know
                                                          
                                                           15. When generating new code for this project:
                                                          
                                                           16. - Always follow the naming conventions above.
                                                               - - Always include a `description` on custom properties.
                                                                 - - New score properties must be added to `WEIGHT_MAP` in `meddiccScoringHandler.js`.
                                                                   - - New properties must be added to `custom-properties.json` and provisioned.
                                                                     - - Test files must cover both positive (allowed) and negative (blocked) scenarios
                                                                       -   for any new stage gate validation rule.
                                                                       -   - The scoring handler is pure JavaScript with no HubSpot dependencies, making it
                                                                           -   easy to test with Jest.
