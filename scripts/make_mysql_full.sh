#!/bin/sh

# for full release files

# command <directory_int> <directory_ext>
DIR_INT=$1
DIR_EXT=$2
DATE_INT=`echo $DIR_INT | cut -d'_' -f 4 | cut -d'T' -f 1`
DATE_EXT=`echo $DIR_EXT | cut -d'_' -f 4-5 | cut -d'T' -f 1`

DBNAME="snomed_full_$DATE_EXT"

echo "
CREATE DATABASE IF NOT EXISTS $DBNAME CHARACTER SET=utf8 COLLATE utf8_unicode_ci;

USE $DBNAME;


\! echo ""concepts""
DROP TABLE IF EXISTS concepts;
CREATE TABLE concepts (
id BIGINT UNSIGNED NOT NULL,
effectiveTime INT UNSIGNED NOT NULL,
active BOOL NOT NULL,
moduleId BIGINT UNSIGNED NOT NULL,
definitionStatusId BIGINT UNSIGNED NOT NULL,
#fsn CHAR(255) NOT NULL,
#semtag VARCHAR(45),
#descendants INT UNSIGNED,
PRIMARY KEY (id, effectiveTime)
#KEY semtag (semtag)
)ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

LOAD DATA LOCAL INFILE '$DIR_INT/Full/Terminology/sct2_Concept_Full_INT_$DATE_INT.txt' INTO TABLE concepts IGNORE 1 LINES (Id, effectiveTime, active, moduleId, definitionStatusId);

LOAD DATA LOCAL INFILE '$DIR_EXT/Full/Terminology/sct2_Concept_Full_$DATE_EXT.txt' INTO TABLE concepts IGNORE 1 LINES (Id, effectiveTime, active, moduleId, definitionStatusId);

CREATE OR REPLACE VIEW concepts_snap AS
SELECT c1.* FROM concepts c1
  JOIN (SELECT id, max(effectiveTime) as maxTime FROM concepts
GROUP BY id) c2 ON c1.id = c2.id AND c1.effectiveTime = c2.maxTime;

\! echo ""descriptions""
DROP TABLE IF EXISTS descriptions;
CREATE TABLE descriptions (
id BIGINT UNSIGNED NOT NULL,
effectiveTime INT UNSIGNED NOT NULL,
active BOOL NOT NULL,
moduleId BIGINT UNSIGNED NOT NULL,
conceptId BIGINT UNSIGNED NOT NULL,
languageCode CHAR(2) NOT NULL,
typeId BIGINT UNSIGNED NOT NULL,
term CHAR(255) NOT NULL,
caseSignificanceId BIGINT UNSIGNED NOT NULL,
stemTerm CHAR(255) NOT NULL,
PRIMARY KEY (id, effectiveTime),
KEY term (term, languageCode),
KEY conceptId (conceptId)
)ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

LOAD DATA LOCAL INFILE '$DIR_INT/Full/Terminology/sct2_Description_Full-en_INT_$DATE_INT.txt' INTO TABLE descriptions IGNORE 1 LINES;

LOAD DATA LOCAL INFILE '$DIR_EXT/Full/Terminology/sct2_Description_Full-en_$DATE_EXT.txt' INTO TABLE descriptions IGNORE 1 LINES;
LOAD DATA LOCAL INFILE '$DIR_EXT/Full/Terminology/sct2_Description_Full-sv_$DATE_EXT.txt' INTO TABLE descriptions IGNORE 1 LINES;

#UPDATE concepts, descriptions SET fsn = term WHERE concepts.Id = descriptions.conceptID AND typeId = 900000000000003001 AND descriptions.active=1;

#UPDATE concepts SET semtag = TRIM(TRAILING ')' FROM SUBSTRING_INDEX(fsn, '(', -1)) WHERE active = 1;

\! echo ""relationships""
DROP TABLE IF EXISTS relationships;
CREATE TABLE relationships (
id BIGINT UNSIGNED NOT NULL,
effectiveTime INT UNSIGNED NOT NULL,
active BOOL NOT NULL,
moduleId BIGINT UNSIGNED NOT NULL,
sourceId BIGINT UNSIGNED NOT NULL,
destinationId BIGINT UNSIGNED NOT NULL,
relationshipGroup TINYINT UNSIGNED NOT NULL,
typeId BIGINT UNSIGNED NOT NULL,
characteristicTypeId BIGINT UNSIGNED NOT NULL,
modifierId BIGINT UNSIGNED NOT NULL,
PRIMARY KEY (id, effectiveTime)
)ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

LOAD DATA LOCAL INFILE '$DIR_INT/Full/Terminology/sct2_Relationship_Full_INT_$DATE_INT.txt' INTO TABLE relationships IGNORE 1 LINES;

LOAD DATA LOCAL INFILE '$DIR_EXT/Full/Terminology/sct2_Relationship_Full_$DATE_EXT.txt' INTO TABLE relationships IGNORE 1 LINES;

\! echo ""languagerefsets""
DROP TABLE IF EXISTS languagerefsets;
CREATE TABLE languagerefsets (
  id CHAR(36) COLLATE utf8_unicode_ci NOT NULL,
  effectiveTime INT NOT NULL,
  active BOOL NOT NULL,
  moduleId BIGINT(20) UNSIGNED NOT NULL,
  refsetId BIGINT(20) UNSIGNED NOT NULL,
  referencedComponentId BIGINT(20) UNSIGNED NOT NULL,
  acceptabilityId BIGINT(20) UNSIGNED NOT NULL,
  PRIMARY KEY (id, effectiveTime),
  KEY referencedComponentId (referencedComponentId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

LOAD DATA LOCAL INFILE '$DIR_INT/Full/Refset/Language/der2_cRefset_LanguageFull-en_INT_$DATE_INT.txt' INTO TABLE languagerefsets IGNORE 1 LINES;

LOAD DATA LOCAL INFILE '$DIR_EXT/Full/Refset/Language/der2_cRefset_LanguageFull-en_$DATE_EXT.txt' INTO TABLE languagerefsets IGNORE 1 LINES;
LOAD DATA LOCAL INFILE '$DIR_EXT/Full/Refset/Language/der2_cRefset_LanguageFull-sv_$DATE_EXT.txt' INTO TABLE languagerefsets IGNORE 1 LINES;

DROP TABLE IF EXISTS simplerefsets;
CREATE TABLE simplerefsets(
  id CHAR(36) COLLATE utf8_unicode_ci NOT NULL,
  effectiveTime INT NOT NULL,
  active BOOL NOT NULL,
  moduleId BIGINT(20) UNSIGNED NOT NULL,
  refsetId BIGINT(20) UNSIGNED NOT NULL,
  referencedComponentId BIGINT(20) UNSIGNED NOT NULL,
  PRIMARY KEY (id, effectiveTime),
  KEY referencedComponentId (referencedComponentId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE OR REPLACE VIEW relationships_snap AS
SELECT r1.*
FROM relationships r1
  JOIN (SELECT id, max(effectiveTime) as maxTime FROM relationships
GROUP BY id) r2 ON r1.id = r2.id AND r1.effectiveTime = r2.maxTime; 

CREATE OR REPLACE VIEW descriptions_snap AS
SELECT d1.*
FROM descriptions d1
  JOIN (SELECT id, max(effectiveTime) as maxTime FROM descriptions
GROUP BY id) d2 ON d1.id = d2.id AND d1.effectiveTime = d2.maxTime; 

CREATE OR REPLACE VIEW languagerefsets_snap AS
SELECT d1.*
FROM languagerefsets d1
  JOIN (SELECT id, max(effectiveTime) as maxTime FROM languagerefsets
GROUP BY id) d2 ON d1.id = d2.id AND d1.effectiveTime = d2.maxTime;

CREATE OR REPLACE VIEW simplerefsets_snap AS
SELECT d1.*
FROM simplerefsets d1
  JOIN (SELECT id, max(effectiveTime) as maxTime FROM simplerefsets
GROUP BY id) d2 ON d1.id = d2.id AND d1.effectiveTime = d2.maxTime;


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
SELECT Id, Id, 0 FROM concepts_snap WHERE active=1;

INSERT INTO transitiveclosure (subtypeId, supertypeId, pathLength)
SELECT distinct sourceId, destinationId, 1 from relationships_snap
WHERE typeId=116680003 AND active=1;

DROP PROCEDURE IF EXISTS simpleproc;
delimiter @@
CREATE PROCEDURE simpleproc (OUT param1 INT)
BEGIN
SET @v1 := 1;
WHILE @v1 > 0 DO
    INSERT INTO transitiveclosure (supertypeId, subtypeId, pathLength)
    SELECT distinct destinationId,tc.subtypeId, tc.pathLength+1
	FROM relationships_snap INNER JOIN transitiveclosure as tc ON sourceId=tc.supertypeId
    	LEFT OUTER JOIN transitiveclosure As tc2 ON destinationId=tc2.supertypeId AND tc.subtypeId=tc2.subtypeId
    WHERE typeId=116680003 AND relationships_snap.active=1 AND tc2.subtypeId is null;
    SET @v1 := ROW_COUNT();
    SELECT @v1;
END WHILE;
END@@
delimiter ;
CALL simpleproc(@a);

DROP PROCEDURE simpleproc;

DROP TABLE IF EXISTS hierarchies;
CREATE TABLE hierarchies (
conceptId BIGINT UNSIGNED NOT NULL,
term CHAR(255),
displayOrder INT,
PRIMARY KEY (conceptId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

INSERT INTO hierarchies (conceptId, displayOrder) VALUES (138875005, 1);
INSERT INTO hierarchies (conceptId, displayOrder) VALUES (404684003, 2);
INSERT INTO hierarchies (conceptId, displayOrder) VALUES (71388002, 3);
INSERT INTO hierarchies (conceptId, displayOrder) VALUES (123037004, 4);
INSERT INTO hierarchies (conceptId, displayOrder) VALUES (123038009, 5);
INSERT INTO hierarchies (conceptId, displayOrder) VALUES (254291000, 6);
INSERT INTO hierarchies (conceptId, displayOrder) VALUES (373873005, 7);
INSERT INTO hierarchies (conceptId, displayOrder) VALUES (243796009, 8);
INSERT INTO hierarchies (conceptId, displayOrder) VALUES (362981000, 9);
INSERT INTO hierarchies (conceptId, displayOrder) VALUES (105590001, 10);
INSERT INTO hierarchies (conceptId, displayOrder) VALUES (410607006, 11);
INSERT INTO hierarchies (conceptId, displayOrder) VALUES (260787004, 12);

UPDATE hierarchies
  JOIN descriptions_snap ON hierarchies.conceptId = descriptions_snap.conceptId
  JOIN languagerefsets_snap ON descriptions_snap.id = languagerefsets_snap.referencedComponentId
SET hierarchies.term = descriptions_snap.term
WHERE languageCode = "sv"
  AND languagerefsets_snap.acceptabilityId = 900000000000548007
  AND descriptions_snap.active = 1
  AND languagerefsets_snap.active = 1

" | mysql --user=root --password=$MYSQL_PASSWORD --local-infile

cd $DIR_INT/Full/Refset/Content
for file in der2_Refset_*
do
	mysql -e "LOAD DATA LOCAL INFILE '$file' INTO TABLE simplerefsets IGNORE 1 LINES" -u root --password=$MYSQL_PASSWORD --local-infile $DBNAME
done

cd $DIR_EXT/Full/Refset/Content
for file in der2_Refset_*
do
	mysql -e "LOAD DATA LOCAL INFILE '$file' INTO TABLE simplerefsets IGNORE 1 LINES" -u root --password=$MYSQL_PASSWORD --local-infile $DBNAME
done
