"""
Comprueba que el caso del reto 4 («¿Quién saboteó el GranaSAT-II?», versión 2) tiene una sola solución.

Uso:   python comprobar_caso_reto4.py

Con los datos del caso (los mismos que muestra la web: «El equipo de GranaSAT», cámara, telemetría, registro de radio,
accesos, listado de tarjetas, declaraciones y comprobaciones) aplica las deducciones que tiene que hacer el grupo y
verifica que:
- solo Pablo encaja con todas las pruebas;
- cada uno de los demás sospechosos queda descartado por al menos una prueba concreta;
- solo una franja de la acusación contiene la hora del sabotaje en España, y las trampas caen fuera.
Los datos están copiados a mano de especificaciones/reto4_sabotaje.md: si cambias el caso, cámbialos aquí también.
"""

DIFERENCIA_UTC = 2  # horas: hora de España = hora universal + 2 (julio)


def minutos(hora):
    h, m = hora.split(":")
    return int(h) * 60 + int(m)


def espana(hora_universal):
    return minutos(hora_universal) + DIFERENCIA_UTC * 60


# «El equipo de GranaSAT» (lo que el grupo apunta en la libreta)
EQUIPO = {
    "Marta": {"apellido": "Sánchez", "puesto": "Ingeniería de software", "gorra_roja": False, "puertas": {"L"}},
    "Javier": {"apellido": "Ortega", "puesto": "Operación de radio", "gorra_roja": False, "puertas": {"L", "A"},
               "deja_auriculares_en_la_azotea": True, "deja_chaqueta_por_ahí": True},
    "Lucía": {"apellido": "Martín", "puesto": "Técnica de antenas", "gorra_roja": True, "puertas": {"A"}},  # sin el casco
    "Pablo": {"apellido": "Ruiz", "puesto": "Becario/a", "gorra_roja": True, "puertas": {"L"}},
}
SOSPECHOSOS = list(EQUIPO) + ["Hacker externo"]

# Carpeta 1 · cámara (hora del satélite = universal)
FOTO = {"hora_universal": "12:31", "gorra_roja": True, "auriculares_verdes_en_la_mesa": True}
# Carpeta 2 · telemetría y carpeta 3 · registro de radio (hora universal) y plan de trabajo (hora de España)
ORDENES = [("08:15", "GS1", "ROT +015"), ("08:17", "GS1", "ROT 000"), ("11:40", "GS1", "DL IMG"), ("12:32", "GS2", "ROT +180")]
# Plan de trabajo (hora de España): la calibración de las 10:15 es «girar un poco y volver a dejarlo como estaba»,
# así que incluye el giro y la vuelta de unos minutos después. La de las 16:30 está tachada (aplazada).
PLAN_ESPANA = [("10:15", "calibración: girar y volver", 5), ("13:40", "descarga de las fotos", 0)]
ESTACIONES = {"GS1": "L", "GS2": "A"}
ORDEN_REQUIERE_ESTAR_DENTRO = True
# Carpeta 4 · accesos (hora de España), listado de tarjetas, declaraciones y comprobaciones
ACCESOS = [("09:00", "0412", "L", "entrada"), ("13:50", "1133", "A", "entrada"), ("14:00", "1580", "L", "entrada"),
           ("14:20", "1133", "A", "salida"), ("14:20", "1580", "L", "salida"), ("14:25", "0957", "A", "entrada"),
           ("14:45", "0957", "A", "salida"), ("18:00", "0412", "L", "salida")]
TARJETAS = {"0412": ("Ingeniería de software", {"L"}), "0957": ("Operación de radio", {"L", "A"}),
            "1133": ("Técnica de antenas", {"A"}), "1580": ("Becario/a", {"L"})}
# Comprobaciones: (persona, desde, hasta, dónde estaba según una prueba que no depende de su palabra)
ACTA_REUNION = ("J. Ortega", "14:00", "15:00")
TRANSPORTE = ("L. Martín", "14:28")
CAJERA = ("14:00", "15:00", "no vino ningún chico con gorra roja")
OPCIONES_CUANDO = ["12:15–12:30", "12:30–12:45", "13:30–13:45", "14:15–14:30", "14:30–14:45", "15:00–15:15"]


def deducir():
    descartes = {s: [] for s in SOSPECHOSOS}

    # Cómo y cuándo: la única orden fuera del plan (al pasar a hora de España) es la del sabotaje
    en_plan = lambda m: any(minutos(h) <= m <= minutos(h) + margen for h, _, margen in PLAN_ESPANA)
    fuera_del_plan = [o for o in ORDENES if not en_plan(espana(o[0]))]
    sin_convertir = [o for o in ORDENES if not en_plan(minutos(o[0]))]
    assert len(sin_convertir) == len(ORDENES), "sin convertir la hora, ninguna orden debería coincidir con el plan"
    assert fuera_del_plan == [("12:32", "GS2", "ROT +180")], fuera_del_plan
    hora, estacion, _ = fuera_del_plan[0]
    sabotaje = espana(hora)                      # 14:32 en España
    lugar = ESTACIONES[estacion]                 # la azotea

    # Cuándo: una sola franja contiene la hora del sabotaje
    franjas = [f for f in OPCIONES_CUANDO if minutos(f.split("–")[0]) <= sabotaje < minutos(f.split("–")[1])]
    assert franjas == ["14:30–14:45"], franjas
    assert any(minutos(f.split("–")[0]) <= minutos(hora) < minutos(f.split("–")[1]) for f in OPCIONES_CUANDO), "falta la trampa de la hora universal"
    assert any(minutos(f.split("–")[0]) <= minutos("14:25") < minutos(f.split("–")[1]) for f in OPCIONES_CUANDO), "falta la trampa de la hora de la tarjeta"

    # La cámara fotografió al saboteador un minuto antes del giro
    assert espana(FOTO["hora_universal"]) == sabotaje - 1

    # Hacker externo: para enviar la orden hay que estar dentro de la estación
    if ORDEN_REQUIERE_ESTAR_DENTRO:
        descartes["Hacker externo"].append("la orden solo se puede enviar desde dentro de la estación (norma de la llave física)")

    # ¿Qué tarjeta abrió la azotea antes del sabotaje y de quién es? (listado de tarjetas + «El equipo»)
    dueno = {num: next(p for p, d in EQUIPO.items() if d["puesto"] == puesto) for num, (puesto, _) in TARJETAS.items()}
    dentro = set()
    for h, num, puerta, tipo in sorted(ACCESOS, key=lambda a: minutos(a[0])):
        if minutos(h) > sabotaje:
            break
        if puerta == lugar:
            (dentro.add if tipo == "entrada" else dentro.discard)(num)
    assert dentro == {"0957"} and dueno["0957"] == "Javier", (dentro, dueno)

    # Javier: el acta de la reunión lo pone en otro sitio a esa hora → alguien usó su tarjeta (dejó la chaqueta)
    nombre, desde, hasta = ACTA_REUNION
    assert nombre.split()[-1] == EQUIPO["Javier"]["apellido"]
    if minutos(desde) <= sabotaje <= minutos(hasta):
        descartes["Javier"].append("el acta de la reunión (6 firmas) lo sitúa en la reunión de 14:00 a 15:00")
    assert EQUIPO["Javier"]["deja_chaqueta_por_ahí"]

    # La foto: gorra roja → solo quien la lleva (los auriculares verdes son de Javier y se quedan en la azotea)
    assert EQUIPO["Javier"]["deja_auriculares_en_la_azotea"]
    for p, d in EQUIPO.items():
        if FOTO["gorra_roja"] and not d["gorra_roja"]:
            descartes[p].append("la persona de la foto lleva gorra roja y no es su caso")

    # Marta: su tarjeta no sale del laboratorio hasta las 18:00
    tarjeta_marta = next(n for n, (puesto, _) in TARJETAS.items() if dueno[n] == "Marta")
    salidas = [minutos(h) for h, n, _, t in ACCESOS if n == tarjeta_marta and t == "salida"]
    if salidas and min(salidas) > sabotaje:
        descartes["Marta"].append("su tarjeta no la registra saliendo del laboratorio hasta las 18:00")

    # Lucía: tarjeta de transporte subiendo al autobús antes del sabotaje
    nombre, h = TRANSPORTE
    assert nombre.split()[-1] == EQUIPO["Lucía"]["apellido"]
    if minutos(h) < sabotaje:
        descartes["Lucía"].append("su tarjeta de transporte la registra en el autobús a las 14:28")

    # Pablo: dice que estaba en la cafetería, pero la cajera no vio a ningún chico con gorra roja → sin coartada
    assert minutos(CAJERA[0]) <= sabotaje <= minutos(CAJERA[1])
    return descartes, sabotaje


def main():
    descartes, sabotaje = deducir()
    encajan = [s for s, motivos in descartes.items() if not motivos]
    for s, motivos in descartes.items():
        print(f"{s:15} {'ENCAJA con todas las pruebas' if not motivos else 'descartado: ' + '; '.join(motivos)}")
    print(f"Hora del sabotaje en España: {sabotaje // 60:02d}:{sabotaje % 60:02d}")
    assert encajan == ["Pablo"], encajan
    assert all(descartes[s] for s in SOSPECHOSOS if s != "Pablo")
    print("El caso es coherente: solo Pablo encaja y cada uno de los demás queda descartado por al menos una prueba.")


if __name__ == "__main__":
    main()
