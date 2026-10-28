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
   un archivo y una línea concretos. Si algo no lo pudiste confirmar, decilo como pregunta
   abierta en vez de afirmarlo.
5. Si el tema resulta más grande de lo que parecía, no lo recortes en silencio: relevá todo y
   marcá en "Alcance" qué quedó fuera y por qué.

## Pasos

1. Identificá los archivos involucrados: interfaces, servicios, componentes, módulos, reglas
   de Firestore, Cloud Functions.
2. Rastreá los puntos de consumo: quién importa qué, desde dónde se invoca cada método,
   qué componentes lo usan.
3. Revisá CLAUDE.md y las skills del módulo correspondiente por deuda ya registrada sobre
   el tema.
4. Escribí el archivo `docs/auditorias/<tema-en-kebab-case>.md` con la plantilla de abajo.
5. En el chat devolvé sólo la ruta del archivo y entre 3 y 5 líneas con los hallazgos más
   relevantes. El detalle va en el archivo, no en la respuesta.

## Plantilla del archivo

```markdown
# Auditoría — <tema>

Fecha: <YYYY-MM-DD> · Rama: <rama actual>

## Alcance

Qué se relevó y qué quedó explícitamente afuera.

## Inventario de archivos

| Archivo | Tipo | Rol |
|---|---|---|

## Interfaces y tipos

Definiciones actuales, transcriptas, con su archivo y línea.

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
