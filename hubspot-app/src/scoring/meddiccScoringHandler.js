/**
 * MEDDICCScoringHandler
  *
   * Handles composite MEDDICC score calculation on HubSpot Deal records.
    * Used by the HubSpot custom coded workflow action to recalculate
     * the composite score whenever a MEDDICC score property changes.
      *
       * Scoring weights (sum to 100):
        *   Champion          20%
         *   Economic Buyer    20%
          *   Metrics           15%
           *   Identified Pain   15%
            *   Decision Criteria 12%
             *   Decision Process  12%
              *   Competition        6%
               *
                * Each element is scored 1-5. The composite score is normalized to 0-100.
                 * An unscored element (null or empty) contributes 0 to the composite.
                  *
                   * To extend to MEDDPICC: add a Paper Process score property, assign it a weight,
                    * reduce other weights proportionally, and add the entry to WEIGHT_MAP below.
                     */

                     // Weight map keyed by HubSpot deal property internal name. Values must sum to 100.
                     const WEIGHT_MAP = {
                       meddicc_metrics_score:          15,
                         meddicc_economic_buyer_score:   20,
                           meddicc_decision_criteria_score: 12,
                             meddicc_decision_process_score:  12,
                               meddicc_identified_pain_score:   15,
                                 meddicc_champion_score:          20,
                                   meddicc_competition_score:        6,
                                   };

                                   /**
                                    * Calculates the weighted composite score for a single deal.
                                     * Property values are stored as strings ('1' through '5').
                                      * Null, undefined, or empty values contribute 0 to the composite.
                                       *
                                        * Formula:
                                         *   composite = SUM(score_i * weight_i) / 5
                                          *
                                           * Dividing by 5 normalizes from the 1-5 scale to 0-100.
                                            *
                                             * @param {Object} dealProperties - Object containing deal property values
                                              * @returns {number} The composite score rounded to 1 decimal place (0-100)
                                               */
                                               function calculateCompositeScore(dealProperties) {
                                                 let weightedSum = 0;

                                                   for (const [propertyName, weight] of Object.entries(WEIGHT_MAP)) {
                                                       const rawValue = dealProperties[propertyName];
                                                           if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
                                                                 const score = Number(rawValue);
                                                                       if (!isNaN(score) && score >= 1 && score <= 5) {
                                                                               weightedSum += score * weight;
                                                                                     }
                                                                                         }
                                                                                           }

                                                                                             // Normalize: max possible weightedSum is 5 * 100 = 500
                                                                                               return Math.round((weightedSum / 5) * 10) / 10;
                                                                                               }

                                                                                               /**
                                                                                                * Returns true if any MEDDICC score property has changed between
                                                                                                 * the previous and current values. Used to skip unnecessary
                                                                                                  * recalculation when only non-scoring properties were modified.
                                                                                                   *
                                                                                                    * @param {Object} currentProperties - Current deal property values
                                                                                                     * @param {Object} previousProperties - Previous deal property values
                                                                                                      * @returns {boolean}
                                                                                                       */
                                                                                                       function scoreFieldChanged(currentProperties, previousProperties) {
                                                                                                         if (!previousProperties) return true;
                                                                                                         
                                                                                                           for (const propertyName of Object.keys(WEIGHT_MAP)) {
                                                                                                               const currentVal = currentProperties[propertyName] || '';
                                                                                                                   const previousVal = previousProperties[propertyName] || '';
                                                                                                                       if (currentVal !== previousVal) return true;
                                                                                                                         }
                                                                                                                           return false;
                                                                                                                           }
                                                                                                                           
                                                                                                                           /**
                                                                                                                            * Validates stage gate conditions for deal stage transitions.
                                                                                                                             *
                                                                                                                              * Gate 1 — Discovery → Solution Alignment:
                                                                                                                               *   Metrics and Identified Pain scores must be populated.
                                                                                                                                *
                                                                                                                                 * Gate 2 — Solution Alignment → Negotiation:
                                                                                                                                  *   All 7 scores populated + Composite Score ≥ 65.
                                                                                                                                   *
                                                                                                                                    * @param {string} targetStage - The deal stage the deal is moving to
                                                                                                                                     * @param {Object} dealProperties - Current deal property values
                                                                                                                                      * @param {number} compositeScore - The calculated composite score
                                                                                                                                       * @returns {{ allowed: boolean, message: string }}
                                                                                                                                        */
                                                                                                                                        function validateStageGate(targetStage, dealProperties, compositeScore) {
                                                                                                                                          // Gate 1: Discovery → Solution Alignment
                                                                                                                                            if (targetStage === 'solutionalignment') {
                                                                                                                                                const metricsScore = dealProperties.meddicc_metrics_score;
                                                                                                                                                    const painScore = dealProperties.meddicc_identified_pain_score;
                                                                                                                                                    
                                                                                                                                                        if (!metricsScore || !painScore) {
                                                                                                                                                              return {
                                                                                                                                                                      allowed: false,
                                                                                                                                                                              message: 'Cannot advance to Solution Alignment: Metrics and Identified Pain scores must be populated.',
                                                                                                                                                                                    };
                                                                                                                                                                                        }
                                                                                                                                                                                          }
                                                                                                                                                                                          
                                                                                                                                                                                            // Gate 2: Solution Alignment → Negotiation/Review
                                                                                                                                                                                              if (targetStage === 'negotiationreview') {
                                                                                                                                                                                                  const allPopulated = Object.keys(WEIGHT_MAP).every(
                                                                                                                                                                                                        (prop) => dealProperties[prop] !== null && dealProperties[prop] !== undefined && dealProperties[prop] !== ''
                                                                                                                                                                                                            );
                                                                                                                                                                                                            
                                                                                                                                                                                                                if (!allPopulated) {
                                                                                                                                                                                                                      return {
                                                                                                                                                                                                                              allowed: false,
                                                                                                                                                                                                                                      message: 'Cannot advance to Negotiation/Review: All 7 MEDDICC scores must be populated.',
                                                                                                                                                                                                                                            };
                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                    if (compositeScore < 65) {
                                                                                                                                                                                                                                                          return {
                                                                                                                                                                                                                                                                  allowed: false,
                                                                                                                                                                                                                                                                          message: `Cannot advance to Negotiation/Review: Composite score is ${compositeScore}, minimum required is 65.`,
                                                                                                                                                                                                                                                                                };
                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                                                        return { allowed: true, message: '' };
                                                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                                        
                                                                                                                                                                                                                                                                                        module.exports = {
                                                                                                                                                                                                                                                                                          WEIGHT_MAP,
                                                                                                                                                                                                                                                                                            calculateCompositeScore,
                                                                                                                                                                                                                                                                                              scoreFieldChanged,
                                                                                                                                                                                                                                                                                                validateStageGate,
                                                                                                                                                                                                                                                                                                };
