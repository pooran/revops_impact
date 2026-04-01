/**
 * HubSpot Custom Coded Workflow Action — MEDDICC Score Calculator
  *
   * This action is designed to run inside a HubSpot deal-based workflow.
    * It reads the 7 MEDDICC score properties from the enrolled deal,
     * calculates the weighted composite score, and writes it back to
      * the meddicc_composite_score property.
       *
        * Setup in HubSpot:
         *   1. Create a deal-based workflow triggered when any MEDDICC score property changes.
          *   2. Add a "Custom code" action and paste this file's contents.
           *   3. Under "Properties to include in code", add all 7 score properties
            *      plus meddicc_composite_score and dealstage.
             *   4. Set the secret HUBSPOT_API_KEY (or use a private app access token).
              *
               * The action also optionally enforces stage gate rules if the deal stage
                * is changing, by outputting a validation result that downstream workflow
                 * branches can act on.
                  */

                  const hubspot = require('@hubspot/api-client');
                  const {
                    calculateCompositeScore,
                      validateStageGate,
                      } = require('./meddiccScoringHandler');

                      exports.main = async (event, callback) => {
                        // Properties sent into the action by the workflow
                          const dealProperties = event.inputFields;

                            // Calculate the new composite score
                              const compositeScore = calculateCompositeScore(dealProperties);

                                // Validate stage gate if deal stage is present
                                  const targetStage = dealProperties.dealstage || '';
                                    const gateResult = validateStageGate(targetStage, dealProperties, compositeScore);

                                      // Update the deal's composite score via HubSpot API
                                        const hubspotClient = new hubspot.Client({
                                            accessToken: process.env.HUBSPOT_SECRET_KEY,
                                              });

                                                try {
                                                    await hubspotClient.crm.deals.basicApi.update(event.object.objectId, {
                                                          properties: {
                                                                  meddicc_composite_score: String(compositeScore),
                                                                        },
                                                                            });
                                                                              } catch (err) {
                                                                                  console.error('Failed to update composite score:', err.message);
                                                                                      callback({
                                                                                            outputFields: {
                                                                                                    meddicc_composite_score: compositeScore,
                                                                                                            gate_allowed: false,
                                                                                                                    gate_message: `Error updating deal: ${err.message}`,
                                                                                                                          },
                                                                                                                              });
                                                                                                                                  return;
                                                                                                                                    }
                                                                                                                                    
                                                                                                                                      callback({
                                                                                                                                          outputFields: {
                                                                                                                                                meddicc_composite_score: compositeScore,
                                                                                                                                                      gate_allowed: gateResult.allowed,
                                                                                                                                                            gate_message: gateResult.message,
                                                                                                                                                                },
                                                                                                                                                                  });
                                                                                                                                                                  };
