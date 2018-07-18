SELECT hierarchies.term, count(concepts.id) FROM concepts
  JOIN transitiveclosure ON concepts.id = transitiveclosure.subtypeId
  JOIN hierarchies ON transitiveclosure.supertypeId = hierarchies.conceptId
WHERE active = 1
  AND moduleId = 45991000052106
  AND effectiveTime = 20180531
  AND id IN (SELECT id FROM snomed_full_SE1000052_20180531.concepts GROUP BY id HAVING count(*) = 1)
GROUP BY hierarchies.conceptId, hierarchies.term
ORDER BY hierarchies.displayOrder
