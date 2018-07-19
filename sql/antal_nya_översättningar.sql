SELECT count(DISTINCT descriptions.id) FROM descriptions
  JOIN concepts ON descriptions.conceptId = concepts.id
WHERE concepts.moduleId <> 45991000052106
  AND descriptions.moduleId = 45991000052106
  AND descriptions.effectiveTime = 20180531
  AND descriptions.languageCode = "sv"
  AND descriptions.active = 1