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
      WHERE active = 1
        AND moduleId = 45991000052106
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
      id: 'promoted-concepts',
      description: 'Promotade begrepp sedan förra releasen',
      sql: `
      select id, fsn from concepts_snap2
      where id in (select distinct id
        from concepts
        where id in (select id
            from concepts_snap2
            where id like '%1000052%' and moduleId = 900000000000207008 and effectiveTime > __int_release__)
          and id not in (select id
            from concepts
            where id like '%1000052%' and moduleId = 900000000000207008 and effectiveTime <= __int_release__)
        and effectiveTime < __release__ and moduleId = 45991000052106);`,
      pug: `html
      head
        title Snomed release #{release} - Promotade begrepp sedan förra releasen
      body
        h1 Promotade begrepp sedan förra releasen
        p Antal: #{results.length}
        if results.length
            table
                tr 
                    th ConceptId
                    th Term
                for c in results
                    tr
                        td #{c.id}
                        td #{c.fsn}
        else
            p Inga promotade begrepp sedan förra releasen`

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
      id: 'funky-chars',
      description: 'Konstiga tecken i beskrivningar',
      sql: `
      select id, conceptId, term, languageCode from descriptions_snap
      where active = 1
        and moduleId = 45991000052106
	      and term not regexp '^[\\\\[\\\\]0-9A-Za-zÅÄÖåäöÜüÉé ())-.,=;:%\/<>\^µ\\'{}]*$'
      order by languageCode, term;`,
      pug: `html
      head
        title Snomed release #{release} - Konstiga tecken i beskrivningar
      body
        h1 Konstiga tecken i beskrivningar
        p Antal: #{results.length}
        if results.length
            table
                tr 
                    th DescriptionId
                    th ConceptId
                    th Term
                    th Språk
                for desc in results
                    tr
                        td #{desc.id}
                        td #{desc.conceptId}
                        td #{desc.term}
                        td #{desc.languageCode}
        else
            p Inga konstiga tecken i beskrivningar`
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
      SELECT simpleRefsets_snap.refsetId, descriptions_snap.term, count(*) AS ct FROM simpleRefsets_snap
        JOIN concepts_snap ON simpleRefsets_snap.referencedComponentId = concepts_snap.id
        JOIN descriptions_snap ON simpleRefsets_snap.refsetId = descriptions_snap.conceptId
        JOIN languageRefsets_snap ON descriptions_snap.id = languageRefsets_snap.referencedComponentId
      WHERE simpleRefsets_snap.active = 1
        AND simpleRefsets_snap.referencedComponentId IN (SELECT id FROM concepts_snap WHERE active = 0)
        AND languageRefsets_snap.acceptabilityId = 900000000000548007
        AND descriptions_snap.languageCode = 'sv'
        AND descriptions_snap.active = 1
      GROUP BY simpleRefsets_snap.refsetId, descriptions_snap.term;`,
      pug: `html
      head
        title Snomed release #{release} - Refsets med inaktiva begrepp
      body
        h1 Refsets med inaktiva begrepp
        p Antal: #{results.length}
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
        SELECT simpleRefsets_snap.refsetId, descriptions_snap.term, ifnull(count(concepts_snap.id), 0) AS ct FROM simpleRefsets_snap
            LEFT JOIN concepts_snap ON simpleRefsets_snap.referencedComponentId = concepts_snap.id AND concepts_snap.active = 0
            JOIN descriptions_snap ON simpleRefsets_snap.refsetId = descriptions_snap.conceptId
            JOIN languageRefsets_snap ON descriptions_snap.id = languageRefsets_snap.referencedComponentId
        WHERE simpleRefsets_snap.active = 1
            AND languageRefsets_snap.acceptabilityId = 900000000000548007
            AND descriptions_snap.languageCode = 'sv'
            AND descriptions_snap.active = 1
        GROUP BY simpleRefsets_snap.refsetId, descriptions_snap.term;`,
        pug: `html
        head
          title Snomed release #{release} - Refsets med inaktiva begrepp
        body
          h1 Refsets med inaktiva begrepp
          p Antal: #{results.length}
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
        SELECT simpleRefsets_snap.refsetId, descriptions_snap.term, concepts_snap.id FROM simpleRefsets_snap
            JOIN concepts_snap ON simpleRefsets_snap.referencedComponentId = concepts_snap.id 
            JOIN descriptions_snap ON simpleRefsets_snap.refsetId = descriptions_snap.conceptId
            JOIN languageRefsets_snap ON descriptions_snap.id = languageRefsets_snap.referencedComponentId
        WHERE simpleRefsets_snap.active = 1
            AND concepts_snap.active = 0
            AND languageRefsets_snap.acceptabilityId = 900000000000548007
            AND descriptions_snap.languageCode = 'sv'
            AND descriptions_snap.active = 1
	      ORDER BY refsetId, term`,
        pug: `html
        head
          title Snomed release #{release} - Inaktiva begrepp i refsets
        body
          h1 Inaktiva begrepp som finns aktiva i refsets i den svenska utg&aring;van
          p Antal: #{results.length}
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
                        td
                          a(href='/query/concept-refset-inactive/' + release + '/' + refset.id) #{refset.id}
          else
              p Inga inaktiva begrepp i refsets`
      },
      {
        id: 'concept-refset-inactive',
        nested: true,
        sql: `
        SELECT concepts_snap2.id, term, fsn
        FROM concepts_snap2
          JOIN descriptions_snap ON concepts_snap2.id = descriptions_snap.conceptId
        WHERE descriptions_snap.moduleId = 45991000052106
          AND concepts_snap2.id = __param__;
        `,
        pug: `html
        head
          title Snomed release #{release} - Inaktivt begrepp i refset
        body
          h1 Beskrivningar som f&ouml;rekommer f&ouml;r fler &auml;n ett begrepp med samma semantiska etikett
          p Antal: #{results.length}
          if results.length
              table
                  tr
                    th Begrepps-id
                    th Term
                    th FSN
                  for c in results
                      tr
                        td #{c.id}
                        td #{c.term}
                        td #{c.fsn}
          else
              p Inga dubletter`
      },
      {
        id: 'duplicate-descriptions',
        description: 'Beskrivningar som förekommer för fler än ett begrepp med samma semantiska etikett',
        sql: `SELECT term, semtag, count(descriptions_snap.id) AS ct
        FROM descriptions_snap
          JOIN concepts_snap2 ON descriptions_snap.conceptId = concepts_snap2.id
          JOIN languageRefsets_snap ON descriptions_snap.id = languageRefsets_snap.referencedComponentId
        WHERE languageCode = "sv"
          AND concepts_snap2.active = 1
          AND descriptions_snap.active = 1
          AND languageRefsets_snap.refsetId = 46011000052107
          AND languageRefsets_snap.active = 1
          AND languageRefsets_snap.acceptabilityId = 900000000000548007
        GROUP BY BINARY term, term, semtag
        HAVING count(descriptions_snap.id) > 1
        ORDER BY ct DESC`,
        pug: `html
        head
          title Snomed release #{release} - Dubletter
        body
          h1 Beskrivningar som f&ouml;rekommer f&ouml;r fler &auml;n ett begrepp med samma semantiska etikett
          p Antal: #{results.length}
          if results.length
              table
                  tr
                    th Term
                    th Semantisk etikett
                    th Antal
                  for desc in results
                      tr
                        td 
                          a(href='/releasecheck/query/concept-duplicate/' + release + '/' + desc.term) #{desc.term}
                        td #{desc.semtag}
                        td #{desc.ct}
          else
              p Inga dubletter`
      },
      {
        id: 'descriptions-spaces',
        description: 'Ogiltiga mellanslag i beskrivningar',
        sql: `select id, term
          from descriptions_snap
          where moduleId = 45991000052106
            and active = 1
            and (term regexp '^[[:space:]]+' or term regexp '[[:space:]]+$' or term regexp '[[:space:]]{2,}')`,
        pug: `html
        head
          title Snomed release #{release} - Ogiltiga mellanslag i beskrivningar
        body
          h1 Ogiltiga mellanslag i beskrivningar
          p Antal: #{results.length}
          if results.length
              table
                  tr
                    th Id
                    th Term
                  for desc in results
                      tr
                        td #{desc.id}
                        td #{desc.term}
          else
              p Inga ogiltiga mellanslag`
      },
      {
        id: 'concept-duplicate',
        nested: true,
        sql: `SELECT concepts_snap2.id, term, fsn
        FROM concepts_snap2
          JOIN descriptions_snap ON concepts_snap2.id = descriptions_snap.conceptId
        WHERE concepts_snap2.active = 1
          AND descriptions_snap.active = 1
          AND descriptions_snap.moduleId = 45991000052106
          AND term = '__param__';
        `,
        pug: `html
        head
          title Snomed release #{release} - Dubletter
        body
          h1 Beskrivningar som f&ouml;rekommer f&ouml;r fler &auml;n ett begrepp med samma semantiska etikett
          p Antal: #{results.length}
          if results.length
              table
                  tr
                    th Begrepps-id
                    th Term
                    th FSN
                  for c in results
                      tr
                        td #{c.id}
                        td #{c.term}
                        td #{c.fsn}
          else
              p Inga dubletter`
      },
      {
        id: 'active-langrefset-en-descriptions',
        description: 'Aktiva medlemmar i svenska language refsets som pekar på engelska beskrivningar',
        sql: `
        SELECT S.term, D.referencedComponentId, D.refsetId 
        FROM languageRefsets_snap D 
          inner join descriptions_snap S 
            on D.referencedComponentId = S.id 
        WHERE S.active = 1 AND D.active = 1 and S.languageCode = "en" and S.moduleId = 45991000052106 and D.refsetId <> 900000000000509007 and D.refsetId <> 900000000000508004;`,
        pug: `html
        head
          title Snomed release #{release} - Aktiva medlemmar i svenska language refsets som pekar på engelska beskrivningar
        body
          h1 Aktiva medlemmar i svenska language refsets som pekar på engelska beskrivningar
          p Antal: #{results.length}
          table
              tr
                th RefsetId
                th DescriptionId
                th Term
              for m in results
                  tr
                    td #{m.refsetId}
                    td #{m.referencedComponentId}
                    td #{m.term}
`
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
            languageRefsets_snap l ON d.id = l.referencedComponentId
        WHERE
            d.active = 0 AND l.active = 1`,
        pug: `html
        head
          title Snomed release #{release} - Aktiva i language refset med inaktiva beskrivningar
        body
          h1 Aktiva medlemmar i language refsets som pekar på inaktiva beskrivningar
          p Antal: #{results.length}
          table
              tr
                th Antal
              for desc in results
                  tr
                    td #{desc.ct}`
      },
      {
        id: 'active-langrefset-multiple-descriptions',
        description: 'Flera aktiva medlemmar i language refsets som pekar på samma aktiva beskrivning',
        sql: `
        select refsetId, c.fsn, referencedComponentId, d.term
        from languageRefsets_snap l
          join concepts_snap2 c on l.refsetId = c.id
          join descriptions_snap d on l.referencedComponentId = d.id
        where l.moduleId = 45991000052106
          and l.active = 1
          and c.active = 1
          and d.active = 1
        group by l.refsetId, l.referencedComponentId
        having count(*) > 1;`,
        pug: `html
        head
          title Snomed release #{release} - Flera aktiva medlemmar i language refsets som pekar på samma aktiva beskrivning
        body
          h1 Flera aktiva medlemmar i language refsets som pekar på samma aktiva beskrivning
          p Antal: #{results.length}
          table
              tr
                th RefsetId
                th Refset
                th DescriptionId
                th Term
              for member in results
                  tr
                    td
                      a(href='/query/multi-desc-lang-refset/' + release + '/' + member.refsetId) #{member.refsetId}
                    td #{member.fsn}
                    td #{member.referencedComponentId}
                    td #{member.term}`
      },
      {
        id: 'multi-desc-lang-refset',
        nested: true,
        sql: `select * 
          from languageRefsets_snap l
            join descriptions_snap d on l.referencedComponentId = d.id
          where refsetId = __param__
            and l.active = 1
            and d.active = 1
            and referencedComponentId in (
          select l.referencedComponentId
          from languageRefsets_snap l
          where refsetId = __param__
          group by referencedComponentId
          having count(*) > 1
          );`,
        pug: `html
        head
          title Snomed release #{release} - Inaktivt begrepp i refset
        body
          h1 Beskrivningar som f&ouml;rekommer f&ouml;r fler &auml;n ett begrepp med samma semantiska etikett
          p Antal: #{results.length}
          if results.length
              table
                  tr
                    th Id
                    th EffectiveTime
                    th RefsetId
                    th ReferencedComponentId
                    th Term
                  for c in results
                      tr
                        td #{c.id}
                        td #{c.effectiveTime}
                        td #{c.refsetId}
                        td #{c.referencedComponentId}
                        td #{c.term}
          else
              p Inga dubletter`
      },
      {
        id: 'missing-refset-descriptors',
        description: 'Refsets som saknar RefsetDescriptor',
        sql: `
        select id, fsn
        from concepts_snap2
        where id in (
          select refsetId
          from languageRefsets_snap
          where refsetId not in (SELECT r.referencedComponentId FROM refsetDescriptors_snap r)
        )
        union
        select id, fsn
        from concepts_snap2
        where id in (
          select refsetId
          from simpleRefsets_snap
          where refsetId not in (SELECT r.referencedComponentId FROM refsetDescriptors_snap r)
        );`,
        pug: `html
        head
          title Snomed release #{release} - Refsets som saknar RefsetDescriptor
        body
          h1 Refsets som saknar RefsetDescriptor
          p Antal: #{results.length}
          table
              tr
                th Refset-id
                th Refset-namn
              for refset in results
                  tr
                    td #{refset.id}
                    td #{refset.fsn}`
      },
      {
        id: 'non-concept-refset-ids',
        description: 'Refsets med id:n som inte är begrepps-id:n',
        sql: `
        select distinct r.refsetId
        from simpleRefsets_snap r
        where active = 1 
          and r.refsetId not in (select id from concepts_snap where active = 1)
        order by refsetId;
        `,
        pug: `html
        head
          title Snomed release #{release} - Refsets med id:n som inte är begrepps-id:n
        body
          h1 Refsets med id:n som inte är begrepps-id:n
          p Antal: #{results.length}
          table
              tr
                th Refset-id
              for refset in results
                  tr
                    td #{refset.refsetId}`
      },
	{
        id: 'se-module-with-non-se-ids',
        description: 'Begrepp etc. i svenska modulen som har icke-svenska id:n',
        sql: `
        select 'begrepp' as typ, id, fsn as term, effectiveTime
        from concepts_snap2
        where moduleId = 45991000052106
          and active = 1
          and id not like '%1000052%' and id not like '%1000057%'
        union
        select 'beskrivning' as typ, id, term, effectiveTime
        from descriptions_snap
        where moduleId = 45991000052106
          and active = 1
          and id not like '%1000052%' and id not like '%1000057%'
        union
        select 'relation' as typ, id, sourceId as term, effectiveTime
        from relationships_snap
        where moduleId = 45991000052106
          and active = 1
          and id not like '%1000052%' and id not like '%1000057%'
        union
        select 'lang-refset' as typ, id, referencedComponentId as term, effectiveTime
        from languageRefsets_snap
        where moduleId = 45991000052106
          and active = 1
          and referencedComponentId not like '%1000052%' and referencedComponentId not like '%1000057%'
        union
        select 'axiom' as typ, id, concat(referencedComponentId, ' : ', owlExpression) as term, effectiveTime
        from owlRefsets
        where moduleId = 45991000052106
          and active = 1
          and referencedComponentId not like '%1000052%' and referencedComponentId not like '%1000057%';`,
        pug: `html
        head
          title Snomed release #{release} - Begrepp etc. i svenska modulen som har icke-svenska id:n
        body
          h1 Begrepp etc. i svenska modulen som har icke-svenska id:n
          p Antal: #{results.length}
          table
              tr
                th Typ
                th EffectiveTime
                th Id
                th FSN
              for row in results
                  tr
                    td #{row.typ}
                    td #{row.effectiveTime}
                    td #{row.id}
                    td #{row.term}`
      },
    ];

module.exports = queries;
