# docs/

Documentación de trabajo del proyecto. No es documentación de producto: es el material que
usan las sesiones de diseño y de implementación.

## `docs/auditorias/`

Auditorías crudas de un tema, módulo, servicio o componente. Las genera el comando
`/auditar <tema>` y describen **qué existe y cómo se usa**, sin proponer cambios.

Son el insumo de la fase de diseño: se relevan acá y se interpretan en la conversación de
arquitectura.

Una auditoría es una foto: describe el código del día en que se hizo y no se mantiene al
día. **Cuando un frente la deja superada, lleva una nota fechada en el encabezado**, para
que no se lea como estado actual. La pone quien cierra el frente que la invalidó, no quien
audita. Forma: una sola línea, arriba de todo, inmediatamente después del título:

```
> **Superada (AAAA-MM-DD, <commit o frente>):** <qué afirma que ya no vale>. Estado actual: <CLAUDE.md, skill o diseño donde está>.
```

Si la superan varios frentes, una línea por frente, la más nueva arriba. El cuerpo de la
auditoría no se edita. (`CHANGELOG.md` no lleva estas notas: es histórico por política.)

## `docs/disenos/`

Especificaciones de diseño por frente, acordadas en la conversación de arquitectura antes de
cualquier implementación. Cada una es autocontenida y es lo que lee Claude Code para
implementar, en lugar de recibir instrucciones transcriptas.

Una especificación completa tiene, como mínimo:

- **Alcance funcional**: qué tiene que hacer, qué no.
- **Interfaces y tipos** nuevos o modificados, escritos.
- **Puntos de consumo**: desde dónde se usa y cómo.
- **Fuera de alcance**: qué archivos, módulos o deudas NO se tocan en este frente.
- **Verificación**: qué tiene que pasar para considerarlo terminado.

Los invariantes del proyecto (escrituras atómicas, componentes genéricos de tabla, ownership
por entidad primaria, estado derivado, etc.) NO se repiten en cada especificación: viven en
CLAUDE.md y en las skills por módulo.
