import { useState } from 'react';
import { Receipt, LogIn } from 'lucide-react';
import { useStore, MODO_SERVIDOR } from '../store.jsx';
import { Btn, Field, Input } from '../ui.jsx';

// En modo servidor la lista de empleados no se conoce antes de ingresar: se muestran los de prueba.
const PRUEBA = [
  { cedula: '1000000001', nombre: 'Carlos Ruiz', rol: 'DESARROLLADOR' }, { cedula: '1000000002', nombre: 'Ana Jefe', rol: 'JEFE' },
  { cedula: '1000000003', nombre: 'Pedro Admin', rol: 'ADMIN' }, { cedula: '1000000004', nombre: 'Maria Empleada', rol: 'EMPLEADO' },
  { cedula: '1000000005', nombre: 'Luisa Empleada', rol: 'EMPLEADO' },
];

export default function Login({ onIngreso }) {
  const { state, api } = useStore();
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const entrar = async () => {
    if (cargando) return;
    setCargando(true);
    try {
      await api.login(cedula, password);
      onIngreso();
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 30 }} data-navscope="">
        <div style={{ width: 58, height: 58, borderRadius: 14, background: '#e6eef4', display: 'grid', placeItems: 'center', marginBottom: 18 }}>
          {state.empresa.logo ? <img src={state.empresa.logo} alt="" style={{ width: 58, height: 58, borderRadius: 14, objectFit: 'cover' }} /> : <Receipt size={30} color="var(--primary)" />}
        </div>
        <h1 style={{ fontSize: 24 }}>Iniciar sesión</h1>
        <p className="muted" style={{ marginTop: 6 }}>Ingresa con tu cédula y contraseña.</p>
        <div className="grid" style={{ marginTop: 18 }}>
          <Field label="Cédula">
            <Input autoFocus inputMode="numeric" value={cedula} onChange={(e) => { setCedula(e.target.value.replace(/\D/g, '')); setError(''); }} placeholder="1000000004" />
          </Field>
          <Field label="Contraseña">
            <Input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} onEnter={entrar} placeholder="••••••••" />
          </Field>
          {error && <div className="alert bad" role="alert">{error}</div>}
          <Btn variant="primary" size="lg" icon={LogIn} onClick={entrar} data-nav="" disabled={cargando}>{cargando ? 'Entrando…' : 'Entrar'}</Btn>
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '22px 0 14px' }} />
        <div className="small muted">{MODO_SERVIDOR ? 'Usuarios de prueba (contraseña 1234):' : 'Cédulas de prueba (cualquier contraseña):'}</div>
        <div style={{ fontSize: 14, lineHeight: 1.7, marginTop: 4 }}>
          {(MODO_SERVIDOR ? PRUEBA : state.empleados.filter((e) => e.activo).slice(0, 6)).map((e) => (
            <div key={e.cedula}>
              <button className="icon-btn" style={{ padding: '0 4px', fontSize: 14 }} onClick={() => { setCedula(e.cedula); setPassword(MODO_SERVIDOR ? '1234' : 'demo'); setError(''); }}>
                {e.cedula}
              </button>{' '}— {e.nombre} ({e.rol})
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
