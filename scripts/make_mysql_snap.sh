#!/bin/sh

# command <directory_int> <directory_ext>

DIR_INT=$1
DIR_EXT=$2
DATE_INT=`echo $DIR_INT | cut -d'_' -f 4 | cut -d'T' -f 1`
DATE_EXT=`echo $DIR_EXT | cut -d'_' -f 4-5 | cut -d'T' -f 1`


DBNAME="snomed_$DATE_EXT"
echo "
CREATE DATABASE IF NOT EXISTS $DBNAME CHARACTER SET=utf8 COLLATE utf8_unicode_ci;

USE $DBNAME;

SELECT 'concepts';

DROP TABLE IF EXISTS concepts;
CREATE TABLE concepts (
Id BIGINT UNSIGNED NOT NULL,
effectiveTime INT UNSIGNED NOT NULL,
active BOOL NOT NULL,
moduleId BIGINT UNSIGNED NOT NULL,
definitionStatusId BIGINT UNSIGNED NOT NULL,
fsn CHAR(255) NOT NULL,
semtag VARCHAR(45),
descendants INT UNSIGNED,
PRIMARY KEY (id),
KEY semtag (semtag)
)ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

LOAD DATA LOCAL INFILE '$DIR_INT/Snapshot/Terminology/sct2_Concept_Snapshot_INT_$DATE_INT.txt' INTO TABLE concepts IGNORE 1 LINES (Id, effectiveTime, active, moduleId, definitionStatusId);

LOAD DATA LOCAL INFILE '$DIR_EXT/Snapshot/Terminology/sct2_Concept_Snapshot_$DATE_EXT.txt' INTO TABLE concepts IGNORE 1 LINES (Id, effectiveTime, active, moduleId, definitionStatusId);


\! echo ""descriptions""
DROP TABLE IF EXISTS descriptions;
CREATE TABLE descriptions (
Id BIGINT UNSIGNED NOT NULL,
effectiveTime INT UNSIGNED NOT NULL,
active BOOL NOT NULL,
moduleId BIGINT UNSIGNED NOT NULL,
conceptId BIGINT UNSIGNED NOT NULL,
languageCode CHAR(2) NOT NULL,
typeId BIGINT UNSIGNED NOT NULL,
term CHAR(255) NOT NULL,
caseSignificanceId BIGINT UNSIGNED NOT NULL,
stemTerm CHAR(255) NOT NULL,
PRIMARY KEY (id),
KEY term (term,languageCode),
KEY conceptId (conceptId)
)ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

LOAD DATA LOCAL INFILE '$DIR_INT/Snapshot/Terminology/sct2_Description_Snapshot-en_INT_$DATE_INT.txt' INTO TABLE descriptions IGNORE 1 LINES;

LOAD DATA LOCAL INFILE '$DIR_EXT/Snapshot/Terminology/sct2_Description_Snapshot-en_$DATE_EXT.txt' INTO TABLE descriptions IGNORE 1 LINES;
LOAD DATA LOCAL INFILE '$DIR_EXT/Snapshot/Terminology/sct2_Description_Snapshot-sv_$DATE_EXT.txt' INTO TABLE descriptions IGNORE 1 LINES;

UPDATE concepts, descriptions SET fsn = term WHERE concepts.Id = descriptions.conceptID AND typeId = 900000000000003001 AND descriptions.active=1;

UPDATE concepts SET semtag = TRIM(TRAILING ')' FROM SUBSTRING_INDEX(fsn, '(', -1)) WHERE active = 1;

\! echo ""relationships""
DROP TABLE IF EXISTS relationships;
CREATE TABLE relationships (
Id BIGINT UNSIGNED NOT NULL,
effectiveTime INT UNSIGNED NOT NULL,
active BOOL NOT NULL,
moduleId BIGINT UNSIGNED NOT NULL,
sourceId BIGINT UNSIGNED NOT NULL,
destinationId BIGINT UNSIGNED NOT NULL,
relationshipGroup TINYINT UNSIGNED NOT NULL,
typeId BIGINT UNSIGNED NOT NULL,
characteristicTypeId BIGINT UNSIGNED NOT NULL,
modifierId BIGINT UNSIGNED NOT NULL,
PRIMARY KEY (id)
)ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

LOAD DATA LOCAL INFILE '$DIR_INT/Snapshot/Terminology/sct2_Relationship_Snapshot_INT_$DATE_INT.txt' INTO TABLE relationships IGNORE 1 LINES;

LOAD DATA LOCAL INFILE '$DIR_EXT/Snapshot/Terminology/sct2_Relationship_Snapshot_$DATE_EXT.txt' INTO TABLE relationships IGNORE 1 LINES;

\! echo ""stated""
DROP TABLE IF EXISTS stated;
CREATE TABLE stated (
Id BIGINT UNSIGNED NOT NULL,
effectiveTime INT UNSIGNED NOT NULL,
active BOOL NOT NULL,
moduleId BIGINT UNSIGNED NOT NULL,
sourceId BIGINT UNSIGNED NOT NULL,
destinationId BIGINT UNSIGNED NOT NULL,
relationshipGroup TINYINT UNSIGNED NOT NULL,
typeId BIGINT UNSIGNED NOT NULL,
characteristicTypeId BIGINT UNSIGNED NOT NULL,
modifierId BIGINT UNSIGNED NOT NULL,
PRIMARY KEY (id)
)ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

LOAD DATA LOCAL INFILE '$DIR_INT/Snapshot/Terminology/sct2_StatedRelationship_Snapshot_INT_$DATE_INT.txt' INTO TABLE stated IGNORE 1 LINES;

LOAD DATA LOCAL INFILE '$DIR_EXT/Snapshot/Terminology/sct2_StatedRelationship_Snapshot_$DATE_EXT.txt' INTO TABLE stated IGNORE 1 LINES;

DROP TABLE IF EXISTS languagerefsets;
CREATE TABLE languagerefsets (
  id TEXT NOT NULL,
  effectiveTime INT NOT NULL,
  active BOOL NOT NULL,
  moduleId BIGINT(20) UNSIGNED NOT NULL,
  refsetId BIGINT(20) UNSIGNED NOT NULL,
  referencedComponentId BIGINT(20) UNSIGNED NOT NULL,
  acceptabilityId BIGINT(20) UNSIGNED NOT NULL,
  KEY referencedComponentIdx (referencedComponentId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

LOAD DATA LOCAL INFILE '$DIR_INT/Snapshot/Refset/Language/der2_cRefset_LanguageSnapshot-en_INT_$DATE_INT.txt' INTO TABLE languagerefsets IGNORE 1 LINES;

LOAD DATA LOCAL INFILE '$DIR_EXT/Snapshot/Refset/Language/der2_cRefset_LanguageSnapshot-en_$DATE_EXT.txt' INTO TABLE languagerefsets IGNORE 1 LINES;
LOAD DATA LOCAL INFILE '$DIR_EXT/Snapshot/Refset/Language/der2_cRefset_LanguageSnapshot-sv_$DATE_EXT.txt' INTO TABLE languagerefsets IGNORE 1 LINES;

\! echo ""transitiveclosure""
DROP TABLE IF EXISTS transitiveclosure;
CREATE TABLE transitiveclosure (
subtypeId BIGINT UNSIGNED NOT NULL ,
supertypeId BIGINT UNSIGNED NOT NULL ,
pathLength INT( 11 ) NOT NULL ,
PRIMARY KEY (subtypeId, supertypeId) ,
KEY  subtypeId (  subtypeId ) ,
KEY  supertypeId (  supertypeId ) ,
KEY  pathLength (  pathLength )
) ENGINE = INNODB;

INSERT INTO transitiveclosure (subtypeId, supertypeId, pathLength)
SELECT Id, Id, 0 FROM concepts WHERE active=1;

INSERT INTO transitiveclosure (subtypeId, supertypeId, pathLength)
SELECT distinct sourceId, destinationId, 1 from relationships
WHERE typeId=116680003 AND active=1;

DROP PROCEDURE IF EXISTS simpleproc;
delimiter @@
CREATE PROCEDURE simpleproc (OUT param1 INT)
BEGIN
SET @v1 := 1;
WHILE @v1 > 0 DO
    INSERT INTO transitiveclosure (supertypeId, subtypeId, pathLength)
    SELECT distinct destinationId,tc.subtypeId, tc.pathLength+1
	FROM relationships INNER JOIN transitiveclosure as tc ON sourceId=tc.supertypeId
    	LEFT OUTER JOIN transitiveclosure As tc2 ON destinationId=tc2.supertypeId AND tc.subtypeId=tc2.subtypeId
    WHERE typeId=116680003 AND relationships.active=1 AND tc2.subtypeId is null;
    SET @v1 := ROW_COUNT();
    SELECT @v1;
END WHILE;
END@@
delimiter ;
CALL simpleproc(@a);

DROP PROCEDURE simpleproc;

UPDATE concepts c, (SELECT DISTINCT supertypeId AS Id, count(subtypeId) AS count FROM transitiveclosure GROUP BY supertypeId ) t SET c.descendants = t.count WHERE c.Id = t.Id;

" | mysql --user=root --password=$MYSQL_PASSWORD --local-infile
