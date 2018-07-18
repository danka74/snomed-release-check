SELECT count(DISTINCT descriptions.id) FROM snomed_full_SE1000052_20180531.descriptions
  JOIN snomed_full_SE1000052_20180531.concepts ON descriptions.conceptId = concepts.id
WHERE concepts.moduleId <> 45991000052106
  AND descriptions.moduleId = 45991000052106
  AND descriptions.effectiveTime = 20180531
  AND descriptions.languageCode = "sv"
  AND descriptions.active = 1