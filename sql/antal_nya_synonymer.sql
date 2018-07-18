SELECT count(*)
FROM snomed_full_SE1000052_20180531.descriptions
WHERE active = 1
  AND effectiveTime = 20180531
  AND conceptId IN (
	SELECT conceptId FROM snomed_full_SE1000052_20180531.descriptions
	WHERE active = 1
	  AND languageCode = "sv"
	GROUP BY conceptId
	HAVING count(id) > 1
)