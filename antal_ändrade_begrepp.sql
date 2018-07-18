SELECT count(*) FROM snomed_full_SE1000052_20180531.concepts
WHERE moduleId = 45991000052106
  AND effectiveTime = 20180531
  AND id IN (SELECT id FROM snomed_full_SE1000052_20180531.concepts GROUP BY id HAVING count(*) > 1)
