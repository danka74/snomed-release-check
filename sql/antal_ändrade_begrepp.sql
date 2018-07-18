SELECT count(*) FROM concepts
WHERE moduleId = 45991000052106
  AND effectiveTime = 20180531
  AND id IN (SELECT id FROM concepts GROUP BY id HAVING count(*) > 1)
