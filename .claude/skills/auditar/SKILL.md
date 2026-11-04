---
name: auditar
description: Auditoría cruda de un tema, módulo, servicio o componente de ApLog. Releva qué existe y cómo se usa y lo deja como archivo en docs/auditorias/. No propone cambios ni toca código.
disable-model-invocation: true
---

# Auditar: $ARGUMENTS

Relevá el estado actual de **$ARGUMENTS** en el proyecto y dejá el resultado como archivo.

## Reglas

1. **Esta tarea es de solo lectura.** No modifiques, crees ni borres ningún archivo de
   código. La única escritura permitida es el archivo de auditoría en `docs/auditorias/`.
2. **No propongas diseño ni mejoras.** Esta auditoría releva datos; la interpretación y las
   decisiones de arquitectura se toman en la conversación de diseño, no acá. Si detectás algo
   que parece un problema, describilo como hallazgo factual —"el método X no valida Y"— sin
   proponer cómo resolverlo.
3. **Usá subagentes `Explore`** para el relevamiento, de forma que la lectura de archivos no
   consuma el contexto principal. Podés lanzar varios en paralelo para áreas distintas.
4. **No infieras: verificá.** Cada afirmación de la auditoría tiene que estar respaldada por
   un archivo y el nombre del método, del componente, de la función o de la sección del
   template —nunca por número de línea. Es la convención de CLAUDE.md: los números se rompen
   con cada edición y una cita falsa manda a leer el código equivocado. Si algo no lo pudiste
   confirmar, decilo como pregunta abierta en vez de afirmarlo.
5. Si el tema resulta más grande de lo que parecía, no lo recortes en silencio: relevá todo y
   marcá en "Alcance" qué quedó fuera y por qué.
6. **Si el código contradice la documentación o la premisa, eso va primero.** CLAUDE.md, las
   skills y el contexto que viene en la instrucción son afirmaciones *sobre* el código, no el
   código: cuando una no se sostiene, es el hallazgo más valioso de la auditoría. Va en la
   sección "Contradicciones con la documentación vigente" del archivo y en la primera línea de
   la respuesta del chat, con la cita que lo prueba. No corrijas la documentación acá: la
   corrección se decide en el diseño y se aplica en el frente que la invalidó.

## Pasos

1. Identificá los archivos involucrados: interfaces, servicios, componentes, módulos, reglas
   de Firestore, Cloud Functions.
2. Rastreá los puntos de consumo: quién importa qué, desde dónde se invoca cada método,
   qué componentes lo usan.
3. Revisá CLAUDE.md y las skills del módulo correspondiente por deuda ya registrada sobre
   el tema, y contrastá lo que afirman contra el código (regla 6).
4. Escribí el archivo `docs/auditorias/<tema-en-kebab-case>.md` con la plantilla de abajo.
5. En el chat devolvé la ruta del archivo y entre 3 y 5 líneas con los hallazgos más
   relevantes; si hubo contradicciones (regla 6), van antes de esas líneas. El detalle va en
   el archivo, no en la respuesta.

## Plantilla del archivo

```markdown
# Auditoría — <tema>

Fecha: <YYYY-MM-DD> · Rama: <rama actual>

## Alcance

Qué se relevó y qué quedó explícitamente afuera.

## Contradicciones con la documentación vigente

Afirmaciones de CLAUDE.md, de una skill o de la instrucción que el código no sostiene, con la
cita que lo prueba. Si no hubo ninguna, decirlo explícitamente.

## Inventario de archivos

| Archivo | Tipo | Rol |
|---|---|---|

## Interfaces y tipos

Definiciones actuales, transcriptas, con su archivo y el nombre del tipo.

## Servicios y métodos

| Servicio | Método | Qué hace | Escribe en | Atómico |
|---|---|---|---|---|

## Componentes y puntos de consumo

| Componente | Cómo lo usa | Archivo |
|---|---|---|

## Colecciones de Firestore involucradas

Colección, forma del documento, quién escribe, quién lee.

## Dependencias con otros módulos

Qué otros módulos dependen de esto y de qué manera. Marcar los que están en el modelo viejo.

## Inconsistencias y deuda detectada

Hechos, no propuestas: duplicaciones, TODOs, código comentado, escrituras no atómicas,
tipos inconsistentes, estado persistido que debería ser derivado.

## Preguntas abiertas

Lo que no se pudo determinar leyendo el código y hay que definir en el diseño.
```
