# Reto 1 · Varias fotos: «el fotógrafo invisible» (propuesta para revisar)

> **Estado: implementada** (aprobada por la organización). Generador: `herramientas/generar_pistas_reto1.py`; fotos y
> créditos en `recursos/imagenes/reto1_fotos/`. Los identificadores se comprobaron en images.nasa.gov: el de la foto E
> era otro (AS17-134-20380 no existe) y se corrigió a **AS17-134-20386**, cuya ficha dice que la hizo Harrison Schmitt.

## 1. La idea

Ahora todos los grupos reciben la misma pista SSTV (Aldrin en la Luna, «¿Quién hizo esta fotografía?»). La propuesta
es que cada grupo reciba **al azar una de cinco fotos históricas del espacio**, todas con la misma clase de pregunta
escrita en la imagen: **¿quién hizo esta fotografía?**

Todas comparten el truco de la foto actual: **el fotógrafo no sale en la foto**, y hay que razonar quién sostenía la
cámara (quién iba en la misión y quién no aparece). Así el reto sigue siendo el mismo, el tutorial y la tarjeta del panel
(«averiguad quién la hizo») siguen valiendo, y cada grupo tiene su propia respuesta.

## 2. Las cinco fotos

Todas de la NASA, de **dominio público** (las fotos de misiones de la NASA no tienen derechos de autor en EE. UU.; se
cita «NASA» igualmente). Fuente para descargarlas: images.nasa.gov, buscando por el identificador.

| # | Foto | Identificador | Fecha | Quién la hizo (respuesta) | Dificultad |
|---|---|---|---|---|---|
| A | Buzz Aldrin en la Luna, con la cámara reflejada en el visor (la actual) | AS11-40-5903 | 20-07-1969 | **Neil Armstrong** | Media |
| B | El módulo lunar volviendo de la Luna, con la Tierra detrás: salen todos los seres humanos de la historia… menos uno | AS11-44-6642 | 21-07-1969 | **Michael Collins** | Media |
| C | Ed White flotando en el primer paseo espacial de EE. UU. | S65-30433 | 03-06-1965 | **James McDivitt** | Alta |
| D | «Salida de la Tierra»: la Tierra asomando sobre el horizonte de la Luna | AS08-14-2383 | 24-12-1968 | **William Anders** | Alta |
| E | Eugene Cernan junto a la bandera en la Luna, en la última misión que pisó la Luna | AS17-134-20386 | 12-1972 | **Harrison Schmitt** | Alta |

Reserva, por si alguna no convence: **Neil Armstrong dentro del módulo lunar tras el paseo** (AS11-37-5528), hecha por
**Buzz Aldrin**. No la meto en las cinco porque es la misma escena que la A con la respuesta al revés.

### Respuestas aceptadas (se normalizan: sin tildes, mayúsculas ni espacios)

| # | Se acepta |
|---|---|
| A | neil armstrong · armstrong · neil alden armstrong · neil amstrong · amstrong (las de ahora) |
| B | michael collins · mike collins · collins · michael colins · colins |
| C | james mcdivitt · jim mcdivitt · mcdivitt · james mc divitt · mc divitt · james mcdivit · mcdivit |
| D | william anders · bill anders · anders · william andres |
| E | harrison schmitt · jack schmitt · schmitt · harrison smith · harrison schmit · schmit |

El campo sigue pidiendo **nombre y apellido**, pero el apellido solo también vale (como ahora con «armstrong»).

## 3. Pistas de cada foto

Dos pistas por foto, con el mismo coste que ahora (bloquean el reto 30 s, 60 s…). La primera sitúa la foto; la segunda
casi resuelve, como la «Mirad el reflejo» actual.

**A · Aldrin (las de ahora, sin cambios)**
1. *¿Dónde y cuándo?* La foto se tomó en la Luna en julio de 1969, durante la primera misión que llegó a la Luna. En ella
   solo dos astronautas pisaron la superficie.
2. *Mirad el reflejo.* El astronauta de la foto es Buzz Aldrin. En el visor de su casco se refleja quien sostiene la
   cámara: su comandante, el primer ser humano que pisó la Luna.

**B · El módulo lunar y la Tierra**
1. *¿Dónde y cuándo?* La foto se tomó en julio de 1969, en órbita alrededor de la Luna, durante la primera misión que
   llegó a la Luna. Iban tres astronautas.
2. *¿Quién falta?* Dentro del módulo lunar van los dos astronautas que acaban de pisar la Luna, y detrás está la Tierra
   con el resto de la humanidad. El único que no sale es el tercer tripulante, que se quedó en órbita pilotando la nave
   principal.

**C · El paseo espacial**
1. *¿Dónde y cuándo?* La foto se tomó en junio de 1965, en órbita alrededor de la Tierra. La nave era pequeña: solo
   cabían dos astronautas.
2. *¿Quién falta?* El que flota fuera es Ed White, el primer estadounidense que salió al espacio. La foto la hizo su
   compañero, que se quedó dentro de la nave: era el comandante de la misión.

**D · La Tierra sobre la Luna**
1. *¿Dónde y cuándo?* La foto se tomó el 24 de diciembre de 1968, desde la primera nave tripulada que dio vueltas
   alrededor de la Luna (sin bajar). Iban tres astronautas.
2. *¿Quién la hizo?* Los tres eran Frank Borman, Jim Lovell y un novato que se llamaba William. Borman y Lovell iban
   pilotando la nave; el que llevaba la cámara junto a la ventanilla era el novato.
   (Ajustada al implementar: la versión aprobada decía el apellido, y la respuesta no puede estar en claro en la web.)

**E · La última vez en la Luna**
1. *¿Dónde y cuándo?* La foto se tomó en diciembre de 1972, en la última misión que ha pisado la Luna. En la Luna
   bajaron dos astronautas.
2. *¿Quién falta?* El astronauta de la foto es el comandante, Eugene Cernan. La foto la hizo el otro astronauta que
   bajó con él: el único científico (era geólogo) que ha pisado la Luna.

## 4. Cómo se ve la pregunta en la foto

- La imagen se adapta a 640×496 (PD120) sin deformarla.
- La pregunta va en una **franja oscura en la parte de abajo**, en letra grande y blanca, en una o dos líneas:
  «¿Quién hizo esta fotografía?». La foto actual la lleva en letra pequeña y oscura sobre el suelo, y tras decodificarla
  se lee regular: la A también se rehace con la franja para que todas sean iguales.
- Se comprueba la ida y vuelta de cada audio (error medio < 5/255, skill `audio-sstv`) y que la pregunta se lee en la
  imagen decodificada.

## 5. Cuidado: nada que regale respuestas

- **Ningún texto visible del reto 1 dice «Apolo».** Una de las preguntas del reto 2 es «¿Qué misión de la NASA llevó al
  ser humano a la Luna en 1969?» (respuesta APOLO): por eso las pistas dicen «la primera misión que llegó a la Luna» y no
  el nombre. Tampoco va en las fotos ni en los créditos que se ven antes de acertar.
- Las respuestas del reto 1 (nombres de personas) no coinciden con las claves del reto 2 (Apolo, Sputnik, Gagarin,
  Hubble, Laika, Marte, Voyager, Júpiter, Plutón, Saturno).
- Las fotos del puzle (que se ven después de acertar) no repiten ninguna de estas cinco.
- Los identificadores de las fotos no aparecen en la web antes de acertar (buscándolos se encontraría al autor).

## 6. Cómo funciona en la web (como las variantes del reto 2)

- Al entrar por primera vez, a cada grupo le toca una foto al azar y se guarda en su progreso.
- Solo la respuesta de **su** foto abre el puzle y el audio de ORIÓN: no se la pueden pasar entre grupos.
- Las cinco respuestas siguen **cifradas** (nunca en claro en `web/`).
- Cada grupo descarga solo el audio de su foto (unos 4 MB cada uno en `web/assets/data/`).
- El reto y su puntuación no cambian: 5 intentos, bloqueo de 1 minuto, pistas con bloqueo creciente, puzle y ORIÓN.

## 7. Decisiones para la organización

1. **¿Estas cinco fotos o cambiamos alguna?** (hay una de reserva).
2. **Dificultad.** La A es la más fácil (casi todo el mundo conoce a Armstrong); C, D y E son de nombres poco conocidos y,
   sin la segunda pista, cuestan mucho. Opciones: dejarlas así (las pistas lo resuelven), quitar las más difíciles o
   añadir una línea de ayuda en la imagen («Pista: no sale en la foto»).
3. **¿Los grupos tienen internet en el PC?** Si lo tienen, C, D y E se pueden buscar y quedan bien; si no, dependen
   de las pistas.
4. **Descarga de las fotos:** las bajo yo de images.nasa.gov (con tu permiso) o me las pasas tú.
5. **Aviso que ya existe hoy, independiente de esta propuesta:** dos fotos del puzzle llevan en su pie «Apolo 17» y
   «Apolo 15» (`recursos/imagenes/puzle/fotos.json`). Se ven después de acertar el reto 1, pero un grupo al que le toque
   en el reto 2 la pregunta de la misión de 1969 podría leer ahí la palabra. Propuesta: quitar «Apolo» de esos pies
   (por ejemplo, «La Canica Azul: la Tierra vista por los astronautas, 1972»).
