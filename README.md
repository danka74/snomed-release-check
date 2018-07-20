# snomed-release-check

Check release for SNOMED CT releases with an extension.

## Requirements

* MySQL database, tested with 5.7.2 community edition
* NodeJS, tested with 5.2.0

## Install

Clone repository. Run script in folder `/scripts` to load SNOMED CT + extension. User is `root` (creates the database if needed) and password is provided through environment variable `MYSQL_PASSWORD`. Release date is extracted from extension file name.

```
MYSQL_PASSWORD=The_pa55word ./make_mysql_full.sh <path to International release folder> <path to extension release folder>
```

Run web app with NodeJS.

```
node app.js
```

## The database

The original database design by Ronald Cornet.
The database contains a full release of SNOMED CT and has the following tables:

* concepts - contains the full concept file. Primary key is the `id` and `effectiveTime`.
* descriptions - contains the full description file. Primary key is `id` and `effectiveTime`. Indexes for `term`, `languageCode` as well as `conceptId`.
* relationships - contains the full relationships file. Primary key is `id` and `effectiveTime`. Indexes for `sourceId` and `destionationId`.
* hierachies - contains the top concepts of all 19 SNOMED CT hierarchies plus `138875005 | SNOMED CT Concept (SNOMED RT+CTV3) |` for reference in queries. Primary key is `conceptId`.
* languagerefsets - contains all language refsets. Primary key is `id` and `effectiveTime`. Index for `referencedComponentId`.
* transitiveclosure - contains the transitive closeure of the `Is A`-relationship for the current release. Primary key is `subtypeId`, `supertypeId`. Indexes for `subtypeId` and `supertypeId` and `pathLength`.
* simplerefsets - contains all simple refsets in the `Full/Refset/Content/` folder. Primary key is `id` and `effectiveTime`. Index for `referencedComponentId`.

Views are created for making queries for a snapshot of the most recent release:

* concepts_snap
* descriptions_snap
* relationships_snap
* languagerefsets_snap
* simplerefsets_snap


## Adding/changing queries

Queries to check the release are stored in the file `quieries.js` where an array contains all query objects. A query object has four elements: `id`, `description`, `sql`, `pug`. Queries are called through the URL `http://<server>/query/<id>/<release>/<parameter>?`. In the SQL string, the substring `"__release__"` is replaced with the release data, e.g. `20180531` and the string `"__param__"` is replaced with the value of the parameter in the URL. HTML rendering of results is done using pug, see [documentation](http://pugjs.org). The results from the SQL query is passed in the `results` variable and the query id, any parameter, and release date is passed to pug in the `id`, `parameter`, and `release` variables.

E.g.:

```json
{
      id: 'new-concepts',
      description: 'New concepts in this release',
      sql: `
      SELECT hierarchies.term, count(concepts.id) AS ct FROM concepts
        JOIN transitiveclosure ON concepts.id = transitiveclosure.subtypeId
        JOIN hierarchies ON transitiveclosure.supertypeId = hierarchies.conceptId
      WHERE active = 1
        AND moduleId = 45991000052106
        AND effectiveTime = __release__
        AND id IN (SELECT id FROM concepts GROUP BY id HAVING count(*) = 1)
      GROUP BY hierarchies.conceptId, hierarchies.term
      ORDER BY hierarchies.displayOrder;`,
      pug: `html
      head
        title Snomed release #{release} - New concepts
      body
        h1 New concepts
        p Number of new concepts in this release by the SNOMED CT hierarchies.
        table
            for hierarchy in results
                tr
                    td #{hierarchy.term}
                    td #{hierarchy.ct}`
}
```



## TODO

* Hardcoding for the Swedish extension to be removed:
  * in the database load script. Any "sv" and "SE1000052" should be parameterized.
  * one instance in the `app.js`. Use of "SE1000052" in the database name.
* Upgrade to more recent version of Javascript.