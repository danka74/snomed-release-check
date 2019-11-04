const queries = [
    {
      id: 'new-concepts',
      description: 'Nya begrepp i releasen',
      sql: `
      SELECT hierarchies.fsn, count(concepts.id) AS ct FROM concepts
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
        AND descriptions.id NOT IN (SELECT id FROM descriptions WHERE descriptions.moduleId = 45991000052106 AND descriptions.effectiveTime < __release__)
      UNION
      SELECT 'new synonyms', count(*) AS ct FROM descriptions
      WHERE active = 1
        AND effectiveTime = __release__
        AND conceptId IN (
          SELECT conceptId FROM descriptions_snap
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
      SELECT hierarchies.fsn, count(concepts_snap.id) AS ct FROM concepts_snap
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
      SELECT simplerefsets_snap.refsetId, descriptions_snap.term, count(*) AS ct FROM simplerefsets_snap
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
                tr 
                    th RefsetId
                    th Namn
                    th Antal inaktiva begrepp
                for refset in results
                    tr
                        td #{refset.refsetId}
                        td #{refset.term}
                        td #{refset.ct}
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
                  tr
                    th Refset-Id
                    th Namn
                    th Antal inaktiva begrepp
                  for refset in results
                      tr
                        td #{refset.refsetId}
                        td #{refset.term}
                        td #{refset.ct}
          else
              p Inga refset med inaktiva begrepp`
      },
      {
        id: 'inactive-concepts-in-refsets',
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
	ORDER BY refsetId, term`,
        pug: `html
        head
          title Snomed release #{release} - Inaktiva begrepp i refsets
        body
          h1 Inaktiva begrepp som finns aktiva i refsets i den svenska utg&aring;van
          if results.length
              table
                  tr
                    th Refset-Id
                    th Namn
                    th Begrepps-Id
                  for refset in results
                      tr
                        td #{refset.refsetId}
                        td #{refset.term}
                        td #{refset.id}
          else
              p Inga inaktiva begrepp i refsets`
      },
      {
        id: 'duplicate-descriptions',
        description: 'Beskrivningar som förekommer för fler än ett begrepp med samma semantiska etikett',
        sql: `
        SELECT term, semtag, count(descriptions_snap.id) AS ct
        FROM descriptions_snap
          JOIN concepts_snap2 ON descriptions_snap.conceptId = concepts_snap2.id
        WHERE languageCode = "sv" 
          AND concepts_snap2.active = 1
          AND descriptions_snap.active = 1
        GROUP BY BINARY term, term, semtag
        HAVING count(descriptions_snap.id) > 1
        ORDER BY ct DESC`,
        pug: `html
        head
          title Snomed release #{release} - Dubletter
        body
          h1 Beskrivningar som f&ouml;rekommer f&ouml;r fler &auml;n ett begrepp med samma semantiska etikett
          if results.length
              table
                  tr
                    th Term
                    th Semantisk etikett
                    th Antal
                  for desc in results
                      tr
                        td 
                          a(href='/query/concept-duplicate/' + release + '/' + desc.term) #{desc.term}
                        td #{desc.semtag}
                        td #{desc.ct}
          else
              p Inga dubletter`
      },
      {
        id: 'concept-duplicate',
        nested: true,
        sql: `
        SELECT concepts_snap.id, term
        FROM concepts_snap
          JOIN descriptions_snap ON concepts_snap.id = descriptions_snap.conceptId
        WHERE concepts_snap.active = 1
          AND descriptions_snap.active = 1
          AND descriptions_snap.moduleId = 45991000052106
          AND term = '__param__';
        `,
        pug: `html
        head
          title Snomed release #{release} - Dubletter
        body
          h1 Beskrivningar som f&ouml;rekommer f&ouml;r fler &auml;n ett begrepp med samma semantiska etikett
          if results.length
              table
                  tr
                    th Begrepps-id
                    th Term
                  for c in results
                      tr
                        td #{c.id}
                        td #{c.term}
          else
              p Inga dubletter`
      },
      {
        id: 'active-langrefset-inactive-descriptions',
        description: 'Aktiva medlemmar i language refsets som pekar på inaktiva beskrivningar',
        sql: `
        SELECT 
            COUNT(*) AS ct
        FROM
            descriptions_snap d
                JOIN
            languagerefsets_snap l ON d.id = l.referencedComponentId
        WHERE
            d.active = 0 AND l.active = 1`,
        pug: `html
        head
          title Snomed release #{release} - Aktiva i language refset med inaktiva beskrivningar
        body
          h1 Aktiva medlemmar i language refsets som pekar på inaktiva beskrivningar
          table
              tr
                th Antal
              for desc in results
                  tr
                    td #{desc.ct}`
      }
    ];

module.exports = queries;
