trigger MEDDICCScoring on Opportunity (before insert, before update) {
    MEDDICCScoringHandler.handleBeforeSave(Trigger.new, Trigger.oldMap);
}
