const queries = [
    {
      id: 'new-concepts',
      description: 'Nya begrepp i releasen',
      sql: `
      SELECT hierarchies.term, count(concepts.id) AS ct FROM concepts
        JOIN transitiveclosure ON concepts.id = transitiveclosure.subtypeId
        JOIN hierarchies ON transitiveclosure.supertypeId = hierarchies.conceptId
      WHERE active = 1
        AND moduleId = 45991000052106
        AND effectiveTime = __release__
        AND id IN (SELECT id FROM concepts GROUP BY id HAVING count(*) = 1)
      GROUP BY hierarchies.conceptId, hierarchies.term
      ORDER BY hierarchies.displayOrder;`
    },
    {
      id: 'changed-concepts',
      description: 'Ändrade begrepp sedan förra releasen',
      sql: `
      SELECT 'changed', count(*) AS ct FROM concepts
      WHERE moduleId = 45991000052106
        AND effectiveTime = __release__
        AND id IN (SELECT id FROM concepts GROUP BY id HAVING count(*) > 1)
      UNION
      SELECT 'inactivated', count(*) AS ct FROM concepts
      WHERE moduleId = 45991000052106
        AND effectiveTime = __release__
        AND active = 0
        AND id IN (SELECT id FROM concepts GROUP BY id HAVING count(*) > 1)`
    },
    {
      id: 'descriptions',
      description: 'Nya och borttagna beskrivningar',
      sql: `
      SELECT 'new translations', count(DISTINCT descriptions.id) AS ct FROM descriptions
        JOIN concepts ON descriptions.conceptId = concepts.id
      WHERE concepts.moduleId <> 45991000052106
        AND descriptions.moduleId = 45991000052106
        AND descriptions.effectiveTime = __release__
        AND descriptions.languageCode = 'sv'
        AND descriptions.active = 1
      UNION
      SELECT 'new synonyms', count(*) AS ct FROM descriptions
      WHERE active = 1
        AND effectiveTime = __release__
        AND conceptId IN (
          SELECT conceptId FROM descriptions
          WHERE active = 1
            AND languageCode = 'sv'
          GROUP BY conceptId
          HAVING count(id) > 1
      )
      UNION
      SELECT 'inactivated descriptions', count(*) AS ct FROM descriptions
      WHERE moduleId = 45991000052106
        AND effectiveTime = __release__
        AND languageCode = 'sv'
        AND active = 0;`
    },
    {
      id: 'non-translated',
      description: 'Icke-översatta begrepp efter hierarki',
      sql: `
      SELECT hierarchies.term, count(concepts_snap.id) AS ct FROM concepts_snap
        JOIN transitiveclosure ON concepts_snap.id = transitiveclosure.subtypeId
        JOIN hierarchies ON transitiveclosure.supertypeId = hierarchies.conceptId
      WHERE active = 1 
        AND Id NOT IN (SELECT conceptId FROM descriptions_snap WHERE active = 1 AND languageCode = 'sv')
      GROUP BY hierarchies.conceptId, hierarchies.term
      ORDER BY hierarchies.displayOrder;`
    },
    {
      id: 'refsets-with-inactive',
      description: 'Refsets med inaktiva begrepp',
      sql: `
      SELECT simplerefsets_snap.refsetId, descriptions_snap.term, count(*) FROM simplerefsets_snap
        JOIN concepts_snap ON simplerefsets_snap.referencedComponentId = concepts_snap.id
        JOIN descriptions_snap ON simplerefsets_snap.refsetId = descriptions_snap.conceptId
        JOIN languagerefsets_snap ON descriptions_snap.id = languagerefsets_snap.referencedComponentId
        WHERE simplerefsets_snap.active = 1
        AND simplerefsets_snap.referencedComponentId IN (SELECT id FROM concepts_snap WHERE active = 0)
        AND languagerefsets_snap.acceptabilityId = 900000000000548007
        AND descriptions_snap.languageCode = 'sv'
        AND descriptions_snap.active = 1
        GROUP BY simplerefsets_snap.refsetId, descriptions_snap.term;`,
      pug: `html
      head
        title Snomed release #{release} - Refsets med inaktiva begrepp
      body
        h1 Refsets med inaktiva begrepp
        if results.length
            table
                th 
                td RefsetId
                td Namn
                td Antal inaktiva begrepp
                for refset in results
                    tr
                    td refset.id
                    td refset.term
                    td refset.ct
        else
            p Inga refset med inaktiva begrepp`
    },
    {
        id: 'refsets-with-inactive2',
        description: 'Refsets med inaktiva begrepp v2',
        sql: `
        SELECT simplerefsets_snap.refsetId, descriptions_snap.term, ifnull(count(concepts_snap.id), 0) AS ct FROM simplerefsets_snap
            LEFT JOIN concepts_snap ON simplerefsets_snap.referencedComponentId = concepts_snap.id AND concepts_snap.active = 0
            JOIN descriptions_snap ON simplerefsets_snap.refsetId = descriptions_snap.conceptId
            JOIN languagerefsets_snap ON descriptions_snap.id = languagerefsets_snap.referencedComponentId
        WHERE simplerefsets_snap.active = 1
            AND languagerefsets_snap.acceptabilityId = 900000000000548007
            AND descriptions_snap.languageCode = 'sv'
            AND descriptions_snap.active = 1
        GROUP BY simplerefsets_snap.refsetId, descriptions_snap.term;`,
        pug: `html
        head
          title Snomed release #{release} - Refsets med inaktiva begrepp
        body
          h1 Refsets med inaktiva begrepp
          if results.length
              table
                  th 
                  td Refset-Id
                  td Namn
                  td Antal inaktiva begrepp
                  for refset in results
                      tr
                      td refset.refsetId
                      td refset.term
                      td refset.ct
          else
              p Inga refset med inaktiva begrepp`
      },
      {
        id: 'inaktive-concepts-in-refsets',
        description: 'Inaktiva begrepp som finns aktiva i refsets',
        sql: `
        SELECT simplerefsets_snap.refsetId, descriptions_snap.term, concepts_snap.id FROM simplerefsets_snap
            JOIN concepts_snap ON simplerefsets_snap.referencedComponentId = concepts_snap.id 
            JOIN descriptions_snap ON simplerefsets_snap.refsetId = descriptions_snap.conceptId
            JOIN languagerefsets_snap ON descriptions_snap.id = languagerefsets_snap.referencedComponentId
        WHERE simplerefsets_snap.active = 1
            AND concepts_snap.active = 0
            AND languagerefsets_snap.acceptabilityId = 900000000000548007
            AND descriptions_snap.languageCode = 'sv'
            AND descriptions_snap.active = 1
        `,
        pug: `html
        head
          title Snomed release #{release} - Refsets med inaktiva begrepp
        body
          h1 Refsets med inaktiva begrepp
          if results.length
              table
                  th 
                  td Refset-Id
                  td Namn
                  td Begrepps-Id
                  for refset in results
                      tr
                      td refset.refsetId
                      td refset.term
                      td refset.id
          else
              p Inga inaktiva begrepp i refsets`
      }
    ];

module.exports = queries;