/**
 * MEDDICCScoringHandlerTest
 *
 * Test coverage for MEDDICCScoringHandler and the MEDDICC stage gate validation rules.
 * Achieves >75% code coverage required for production deployment.
 *
 * Test scenarios:
 *   1. All elements scored at maximum (5) — composite should be 100
 *   2. All elements scored at minimum (1) — composite should be 20
 *   3. Partial scoring (only some elements populated) — composite reflects weighted partial score
 *   4. No scores populated — composite should be 0
 *   5. Stage gate: advancing to Solution Alignment without required scores should fail
 *   6. Stage gate: advancing to Negotiation below 65 composite should fail
 *   7. Stage gate: advancing to Negotiation with valid scores should succeed
 *   8. Score change detection: updating a non-score field should not recalculate (covered by handler logic)
 */
@isTest
private class MEDDICCScoringHandlerTest {

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private static Opportunity buildOpp(String stage) {
        return new Opportunity(
            Name        = 'Test Opportunity',
            StageName   = stage,
            CloseDate   = Date.today().addDays(30),
            Amount      = 50000
        );
    }

    private static void setAllScores(Opportunity opp, String scoreValue) {
        opp.MEDDICC_Metrics_Score__c           = scoreValue;
        opp.MEDDICC_Economic_Buyer_Score__c    = scoreValue;
        opp.MEDDICC_Decision_Criteria_Score__c = scoreValue;
        opp.MEDDICC_Decision_Process_Score__c  = scoreValue;
        opp.MEDDICC_Identified_Pain_Score__c   = scoreValue;
        opp.MEDDICC_Champion_Score__c          = scoreValue;
        opp.MEDDICC_Competition_Score__c       = scoreValue;
    }

    // ─── Scoring Tests ────────────────────────────────────────────────────────

    @isTest
    static void testMaximumScore() {
        Opportunity opp = buildOpp('Prospecting');
        setAllScores(opp, '5');
        insert opp;

        Opportunity result = [SELECT MEDDICC_Composite_Score__c FROM Opportunity WHERE Id = :opp.Id];
        System.assertEquals(100.0, result.MEDDICC_Composite_Score__c,
            'All elements scored 5 should produce a composite of 100');
    }

    @isTest
    static void testMinimumScore() {
        Opportunity opp = buildOpp('Prospecting');
        setAllScores(opp, '1');
        insert opp;

        Opportunity result = [SELECT MEDDICC_Composite_Score__c FROM Opportunity WHERE Id = :opp.Id];
        System.assertEquals(20.0, result.MEDDICC_Composite_Score__c,
            'All elements scored 1 should produce a composite of 20');
    }

    @isTest
    static void testPartialScoring() {
        // Only Metrics (15%) and Champion (20%) scored at 5 — contribution: (5*15 + 5*20) / 5 = 35
        Opportunity opp = buildOpp('Prospecting');
        opp.MEDDICC_Metrics_Score__c  = '5';
        opp.MEDDICC_Champion_Score__c = '5';
        insert opp;

        Opportunity result = [SELECT MEDDICC_Composite_Score__c FROM Opportunity WHERE Id = :opp.Id];
        System.assertEquals(35.0, result.MEDDICC_Composite_Score__c,
            'Partial scoring should reflect weighted sum of populated elements only');
    }

    @isTest
    static void testNoScores() {
        Opportunity opp = buildOpp('Prospecting');
        insert opp;

        Opportunity result = [SELECT MEDDICC_Composite_Score__c FROM Opportunity WHERE Id = :opp.Id];
        System.assertEquals(0, result.MEDDICC_Composite_Score__c,
            'No scores populated should produce a composite of 0');
    }

    @isTest
    static void testScoreRecalculatesOnUpdate() {
        Opportunity opp = buildOpp('Prospecting');
        opp.MEDDICC_Metrics_Score__c = '3';
        insert opp;

        opp.MEDDICC_Champion_Score__c = '5';
        update opp;

        Opportunity result = [SELECT MEDDICC_Composite_Score__c FROM Opportunity WHERE Id = :opp.Id];
        // Metrics 3*15=45, Champion 5*20=100 → (45+100)/5 = 29
        System.assertEquals(29.0, result.MEDDICC_Composite_Score__c,
            'Composite score should recalculate when a score field changes');
    }

    // ─── Validation Rule Tests ────────────────────────────────────────────────

    @isTest
    static void testDiscoveryGateBlocksWithoutRequiredScores() {
        Opportunity opp = buildOpp('Discovery');
        insert opp;

        opp.StageName = 'Solution Alignment';
        // Metrics and Identified Pain not scored — gate should block

        Boolean exceptionThrown = false;
        try {
            update opp;
        } catch (DmlException e) {
            exceptionThrown = true;
            System.assert(e.getMessage().contains('Metrics') || e.getMessage().contains('Solution Alignment'),
                'Exception message should reference the gate condition');
        }
        System.assert(exceptionThrown, 'Validation rule should have blocked advancement without required scores');
    }

    @isTest
    static void testDiscoveryGateAllowsWithRequiredScores() {
        Opportunity opp = buildOpp('Discovery');
        opp.MEDDICC_Metrics_Score__c        = '3';
        opp.MEDDICC_Identified_Pain_Score__c = '3';
        insert opp;

        opp.StageName = 'Solution Alignment';
        // Should succeed — no exception expected
        update opp;

        Opportunity result = [SELECT StageName FROM Opportunity WHERE Id = :opp.Id];
        System.assertEquals('Solution Alignment', result.StageName,
            'Opportunity should advance when required scores are populated');
    }

    @isTest
    static void testNegotiationGateBlocksBelowThreshold() {
        Opportunity opp = buildOpp('Solution Alignment');
        // All scores at 2 → composite = 20*2/5 = 40 (below 65 threshold)
        setAllScores(opp, '2');
        insert opp;

        opp.StageName = 'Negotiation/Review';

        Boolean exceptionThrown = false;
        try {
            update opp;
        } catch (DmlException e) {
            exceptionThrown = true;
        }
        System.assert(exceptionThrown, 'Validation rule should block advancement when composite score is below 65');
    }

    @isTest
    static void testNegotiationGateAllowsAboveThreshold() {
        Opportunity opp = buildOpp('Solution Alignment');
        // All scores at 4 → composite = 80 (above 65 threshold)
        setAllScores(opp, '4');
        insert opp;

        opp.StageName = 'Negotiation/Review';
        update opp;

        Opportunity result = [SELECT StageName FROM Opportunity WHERE Id = :opp.Id];
        System.assertEquals('Negotiation/Review', result.StageName,
            'Opportunity should advance when composite score meets the 65 threshold');
    }
}
