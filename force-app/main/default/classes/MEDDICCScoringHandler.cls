/**
 * MEDDICCScoringHandler
 *
 * Handles composite MEDDICC score calculation on Opportunity records.
 * Called from the MEDDICCScoring trigger on before insert and before update.
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
 * An unscored element (null or blank picklist) contributes 0 to the composite.
 *
 * To extend to MEDDPICC: add a Paper Process score field, assign it a weight,
 * reduce other weights proportionally, and add the element to the scoreMap below.
 */
public with sharing class MEDDICCScoringHandler {

    // Weight map keyed by field API name. Values must sum to 100.
    private static final Map<String, Decimal> WEIGHT_MAP = new Map<String, Decimal>{
        'MEDDICC_Metrics_Score__c'           => 15,
        'MEDDICC_Economic_Buyer_Score__c'    => 20,
        'MEDDICC_Decision_Criteria_Score__c' => 12,
        'MEDDICC_Decision_Process_Score__c'  => 12,
        'MEDDICC_Identified_Pain_Score__c'   => 15,
        'MEDDICC_Champion_Score__c'          => 20,
        'MEDDICC_Competition_Score__c'       =>  6
    };

    /**
     * Entry point from trigger. Accepts the full list of new records and
     * the old map for change detection. Skips recalculation if no score
     * field has changed (update scenario) to avoid unnecessary processing.
     */
    public static void handleBeforeSave(List<Opportunity> newRecords, Map<Id, Opportunity> oldMap) {
        for (Opportunity opp : newRecords) {
            if (oldMap == null || scoreFieldChanged(opp, oldMap.get(opp.Id))) {
                opp.MEDDICC_Composite_Score__c = calculateCompositeScore(opp);
            }
        }
    }

    /**
     * Returns true if any MEDDICC score picklist field has changed value
     * since the last save. Used to skip unnecessary recalculation on updates
     * where only non-scoring fields were modified.
     */
    private static Boolean scoreFieldChanged(Opportunity newOpp, Opportunity oldOpp) {
        if (oldOpp == null) return true;
        for (String fieldName : WEIGHT_MAP.keySet()) {
            String newVal = (String) newOpp.get(fieldName);
            String oldVal = (String) oldOpp.get(fieldName);
            if (newVal != oldVal) return true;
        }
        return false;
    }

    /**
     * Calculates the weighted composite score for a single opportunity.
     * Picklist values are stored as strings ('1' through '5').
     * Null or blank values contribute 0 to the composite.
     *
     * Formula:
     *   composite = SUM(score_i * weight_i) / 5
     *
     * Dividing by 5 normalizes from the 1-5 scale to 0-100.
     */
    private static Decimal calculateCompositeScore(Opportunity opp) {
        Decimal weightedSum = 0;
        for (String fieldName : WEIGHT_MAP.keySet()) {
            String rawValue = (String) opp.get(fieldName);
            if (String.isNotBlank(rawValue)) {
                Decimal score = Decimal.valueOf(rawValue);
                weightedSum += score * WEIGHT_MAP.get(fieldName);
            }
        }
        // Normalize: max possible weightedSum is 5 * 100 = 500
        return (weightedSum / 5).setScale(1, RoundingMode.HALF_UP);
    }
}
