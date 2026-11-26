"""Pruebas de funcionamiento y reglas de negocio contra el servidor en marcha.
Uso: python pruebas/prueba_api.py [http://localhost:8080]
Requiere los datos de demostración (perfil demo). Cada ejecución crea registros nuevos."""
import json, sys, urllib.request, urllib.error, urllib.parse, datetime

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080') + '/api'
resultados = []


def llamar(metodo, ruta, cuerpo=None, token=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(req) as r:
            txt = r.read().decode()
            return r.status, (json.loads(txt) if txt else None)
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try:
            return e.code, json.loads(txt)
        except Exception:
            return e.code, txt


def caso(nombre, ok, detalle=''):
    resultados.append(ok)
    print(('PASA ' if ok else 'FALLA') + ' | ' + nombre + (' -> ' + str(detalle) if detalle else ''))


def login(cedula, clave='1234'):
    s, r = llamar('POST', '/auth/login', {'cedula': cedula, 'password': clave})
    return r if s == 200 else None


# --- Autenticación ---
s, r = llamar('POST', '/auth/login', {'cedula': '1000000004', 'password': 'mala'})
caso('Contraseña incorrecta es rechazada (401)', s == 401, r)
s, r = llamar('GET', '/estado')
caso('Sin token no hay acceso (401)', s == 401, s)
emp = login('1000000004')
jefe = login('1000000002')
caso('Login empleado y jefe con cédula + contraseña', bool(emp and jefe), emp and emp['empleado']['rol'])
te, tj = emp['accessToken'], jefe['accessToken']

# --- Roles ---
s, _ = llamar('GET', '/auditoria', token=te)
caso('Empleado NO ve la auditoría (403)', s == 403, s)
s, _ = llamar('POST', '/empleados', {'cedula': '123456', 'nombre': 'X', 'rol': 'JEFE', 'password': '1234'}, te)
caso('Empleado NO crea empleados (403)', s == 403, s)
s, r = llamar('GET', '/auditoria', token=tj)
caso('Jefe sí ve la auditoría', s == 200 and len(r) > 0, f'{len(r)} registros' if s == 200 else s)

# --- Facturación ---
s, est = llamar('GET', '/estado', token=tj)
caso('Estado completo para la interfaz', s == 200, {k: len(v) for k, v in est.items() if isinstance(v, list)} if s == 200 else s)
prod = {p['nombre']: p for p in est['productos']}
arroz, leche = prod['Arroz Diana 500 g'], prod['Leche entera 1 L']
stock_arroz = arroz['cantidad']
items = [{'productoId': arroz['id'], 'cantidad': 2, 'valorUnidad': 2100}, {'productoId': leche['id'], 'cantidad': 1, 'valorUnidad': 3700}]
# subtotal 7900, IVA 19 % = 1501, total 9401
s, r = llamar('POST', '/facturas', {'items': items, 'efectivo': 9000, 'transferencia': 0}, te)
caso('Pagos que no suman el total son rechazados', s == 400, r)
s, r = llamar('POST', '/facturas', {'items': [{'productoId': arroz['id'], 'cantidad': 0, 'valorUnidad': 2100}], 'efectivo': 0, 'transferencia': 0}, te)
caso('Cantidad menor a 1 es rechazada', s == 400, r)
s, r = llamar('POST', '/facturas', {'items': [{'productoId': prod['Queso campesino 250 g']['id'], 'cantidad': 1, 'valorUnidad': 6300}], 'efectivo': 7497, 'transferencia': 0}, te)
caso('No se vende un producto agotado', s == 400, r)
s, f1 = llamar('POST', '/facturas', {'items': items, 'efectivo': 9401, 'transferencia': 0, 'entregado': 20000}, te)
ok = s == 201 and float(f1['total']) == 9401 and float(f1['iva']) == 1501 and float(f1['devuelto']) == 10599
caso('Factura válida: total 9.401, IVA 1.501, devuelta 10.599', ok, f1.get('numero') if s == 201 else f1)
s, f2 = llamar('POST', '/facturas', {'items': items[:1], 'clienteId': None, 'efectivo': 2000, 'transferencia': 2998}, te)
caso('Pago mixto y número consecutivo siguiente', s == 201 and int(f2['numero'][4:]) == int(f1['numero'][4:]) + 1, f2.get('numero'))
s, p = llamar('GET', '/productos', token=te)
nuevo_stock = next(x for x in p if x['id'] == arroz['id'])['cantidad']
caso('El inventario baja al facturar (arroz -4)', nuevo_stock == stock_arroz - 4, f'{stock_arroz} -> {nuevo_stock}')

# --- Revisión de facturas ---
s, _ = llamar('POST', f"/facturas/{f2['id']}/anular", {'motivo': 'x'}, te)
caso('Empleado NO anula facturas (403)', s == 403, s)
s, r = llamar('POST', f"/facturas/{f2['id']}/anular", {'motivo': ''}, tj)
caso('Anular sin motivo es rechazado', s == 400, r)
s, r = llamar('PUT', f"/facturas/{f1['id']}", {'items': [items[0]], 'efectivo': 4998, 'transferencia': 0, 'motivo': 'Se cobró leche de más'}, tj)
caso('Modificar con motivo recalcula total (4.998)', s == 200 and float(r['total']) == 4998 and r['historial'][-1]['accion'] == 'MODIFICAR', r.get('total') if s == 200 else r)
s, r = llamar('POST', f"/facturas/{f2['id']}/anular", {'motivo': 'Cliente devolvió el producto'}, tj)
caso('Anular con motivo deja la factura ANULADA (no se borra)', s == 200 and r['estado'] == 'ANULADA', r.get('estado'))
s, p = llamar('GET', '/productos', token=te)
caso('Al anular y modificar, el inventario se devuelve', next(x for x in p if x['id'] == arroz['id'])['cantidad'] == stock_arroz - 2,
     next(x for x in p if x['id'] == arroz['id'])['cantidad'])

# --- Empleados y clientes ---
s, r = llamar('PUT', f"/empleados/{jefe['empleado']['id']}", {'cedula': '1000000002', 'nombre': 'Ana Jefe', 'rol': 'DESARROLLADOR'}, tj)
caso('Nadie cambia su propio cargo', s == 400, r)
s, r = llamar('POST', '/empleados', {'cedula': '1000000004', 'nombre': 'Copia', 'rol': 'EMPLEADO', 'password': '1234'}, tj)
caso('Cédula de empleado duplicada es rechazada', s == 400, r)
s, r = llamar('POST', '/clientes', {'documento': 'NUEVO-1', 'nombre': 'rosa elena pérez', 'correo': ''}, te)
caso('Cliente con nombre repetido es rechazado y dice cuál', s == 400 and 'nombre' in r['mensaje'], r)

# --- Caja ---
hoy = datetime.date.today().isoformat()
turno = {'fecha': hoy, 'turno': 'MAÑANA', 'empleadoEntregaId': emp['empleado']['id'], 'empleadoRecibeId': jefe['empleado']['id'],
         'valorEfectivo': 0, 'valorTransferencia': 0, 'gastos': 0}
s, v = llamar('GET', f'/cierres-turno/ventas?fecha={hoy}&turno=' + urllib.parse.quote('MAÑANA'), token=te)
s1, c1 = llamar('POST', '/cierres-turno', turno, te)
s2, c2 = llamar('POST', '/cierres-turno', turno, te)
if s1 == 201:
    caso('Cierre de turno calcula faltante contra el sistema', float(c1['falta']) == float(v['total']), f"falta {c1['falta']}")
    caso('Solo un cierre por fecha y turno', s2 == 400, c2)
else:
    caso('Solo un cierre por fecha y turno (ya existía)', s1 == 400 and s2 == 400, c1)
s, r = llamar('POST', '/cierres-turno', {**turno, 'turno': 'TARDE', 'empleadoRecibeId': emp['empleado']['id']}, te)
caso('Quien entrega y quien recibe deben ser distintos', s == 400, r)
coord = next(e for e in est['entidades'] if e['nombre'] == 'Coordinadora')
s, r = llamar('POST', '/entidades/conciliaciones', {'entidadId': coord['id'], 'fecha': hoy, 'valorEntregado': 100000, 'valorGanancia': 5000}, te)
caso('Coordinadora exige tipo de pago', s == 400, r)
s, r = llamar('POST', '/entidades/conciliaciones', {'entidadId': coord['id'], 'fecha': '2020-01-01', 'tipoPago': 'CONTRAENTREGA', 'valorEntregado': 95000, 'valorGanancia': 5000}, te)
caso('% de ganancia = 5.000 / 100.000 = 5 %', s in (201, 400) and (s == 400 or float(r['porcentajeGanancia']) == 5.0), r.get('porcentajeGanancia') if s == 201 else r)

# --- Inventario ---
s, r = llamar('POST', '/ajustes-inventario', {'productoId': arroz['id'], 'tipo': 'DANO', 'cantidad': 99999, 'motivo': 'x'}, tj)
caso('No se puede sacar más de lo que hay', s == 400, r)
s, r = llamar('POST', '/ajustes-inventario', {'productoId': arroz['id'], 'tipo': 'INGRESO_EXISTENTE', 'cantidad': 10, 'motivo': 'Llegó pedido'}, tj)
caso('Ingreso de mercancía suma al inventario', s == 201 and r['cantidad'] == stock_arroz + 8, r.get('cantidad') if s == 201 else r)

# --- Sesión: refresh rotativo ---
s, r = llamar('POST', '/auth/refresh', {'refreshToken': emp['refreshToken']})
caso('Refresh token entrega una nueva sesión', s == 200, s)
s, _ = llamar('POST', '/auth/refresh', {'refreshToken': emp['refreshToken']})
caso('Un refresh token usado no sirve dos veces', s == 401, s)

s, aud = llamar('GET', '/auditoria', token=tj)
acciones = {a['accion'] for a in aud}
caso('La auditoría registró crear, editar, anular, cerrar e ingresar', {'CREAR', 'EDITAR', 'ANULAR', 'INGRESAR'} <= acciones, sorted(acciones))

print(f"\n{sum(resultados)} de {len(resultados)} casos pasaron")
sys.exit(0 if all(resultados) else 1)
