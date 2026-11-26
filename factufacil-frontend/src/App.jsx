import { useEffect, useState } from 'react';
import { Home, LogOut, Receipt, PackageX } from 'lucide-react';
import { useStore, usuarioActual } from './store.jsx';
import { MODULOS, puede, veAgotados } from './permisos.js';
import { Btn, Modal } from './ui.jsx';
import Login from './modules/Login.jsx';
import Facturar from './modules/Facturar.jsx';
import Productos from './modules/Productos.jsx';
import Clientes from './modules/Clientes.jsx';
import Empleados from './modules/Empleados.jsx';
import Novedades from './modules/Novedades.jsx';
import Cierres from './modules/Cierres.jsx';
import Entidades from './modules/Entidades.jsx';
import Ajustes from './modules/Ajustes.jsx';
import Facturas from './modules/Facturas.jsx';
import Consolidado from './modules/Consolidado.jsx';
import Analitica from './modules/Analitica.jsx';
import Whatsapp from './modules/Whatsapp.jsx';
import Empresa from './modules/Empresa.jsx';
import Auditoria from './modules/Auditoria.jsx';

const VISTAS = {
  facturar: Facturar, productos: Productos, clientes: Clientes, empleados: Empleados, novedades: Novedades,
  cierres: Cierres, entidades: Entidades, ajustes: Ajustes, facturas: Facturas, consolidado: Consolidado,
  analitica: Analitica, whatsapp: Whatsapp, empresa: Empresa, auditoria: Auditoria,
};

// Navegación por el hash (#facturar) para que el botón "atrás" del navegador funcione.
function useVista() {
  const leer = () => window.location.hash.replace('#', '') || 'menu';
  const [vista, setVista] = useState(leer);
  useEffect(() => {
    const f = () => setVista(leer());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  const ir = (v) => { window.location.hash = v === 'menu' ? '' : v; };
  return [vista, ir];
}

export default function App() {
  const { state, api } = useStore();
  const [vista, ir] = useVista();
  const u = usuarioActual(state);
  // El aviso de agotados sale una sola vez por inicio de sesión.
  const claveAviso = 'agotados-' + (state.sesion?.desde ?? '');
  const [vistoEn, setVistoEn] = useState(() => { try { return sessionStorage.getItem('agotados-visto') || ''; } catch { return ''; } });
  const agotadosVisto = vistoEn === claveAviso;
  const setAgotadosVisto = () => { setVistoEn(claveAviso); try { sessionStorage.setItem('agotados-visto', claveAviso); } catch { /* nada */ } };

  if (!u) return <Login onIngreso={() => ir('menu')} />;

  const modulos = MODULOS.filter((m) => m.roles.includes(u.rol));
  const Vista = vista !== 'menu' && puede(u.rol, vista) ? VISTAS[vista] : null;
  const agotados = state.productos.filter((p) => p.activo && p.cantidad <= 0);
  const mostrarAgotados = !agotadosVisto && veAgotados(u.rol) && agotados.length > 0;

  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={() => ir('menu')} aria-label="Menú principal" style={{ gap: 10, alignItems: 'center' }}>
          {state.empresa.logo
            ? <img src={state.empresa.logo} alt="" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover' }} />
            : <span style={{ width: 38, height: 38, borderRadius: 10, background: '#e6eef4', display: 'grid', placeItems: 'center' }}><Receipt size={22} color="var(--primary)" /></span>}
          <span style={{ textAlign: 'left', lineHeight: 1.15 }}>
            <strong style={{ display: 'block', color: 'var(--text)', fontSize: 16 }}>{state.empresa.nombre}</strong>
            <span className="small muted">Factufacil</span>
          </span>
        </button>
        <div className="spacer" />
        {vista !== 'menu' && <Btn size="sm" icon={Home} onClick={() => ir('menu')}>Menú</Btn>}
        <div style={{ textAlign: 'right', lineHeight: 1.2 }} className="small">
          <strong>{u.nombre}</strong>
          <div className="muted" style={{ fontSize: 12.5 }}>{u.rol}</div>
        </div>
        <button className="icon-btn" title="Salir" aria-label="Salir" onClick={() => api.logout()}><LogOut size={22} /></button>
      </header>

      <main className="page">
        {Vista ? <Vista ir={ir} /> : <Menu modulos={modulos} ir={ir} usuario={u} />}
      </main>

      {mostrarAgotados && (
        <Modal title="Productos agotados" icon={PackageX} color="var(--bad)" onClose={() => setAgotadosVisto(true)}
          footer={<><Btn onClick={() => setAgotadosVisto(true)}>Entendido</Btn><Btn variant="primary" onClick={() => { setAgotadosVisto(true); ir('productos'); }}>Ver productos</Btn></>}>
          <p className="muted" style={{ marginTop: 0 }}>Estos productos están en cero. Conviene pedirlos:</p>
          <ul style={{ fontSize: 17, lineHeight: 1.8, margin: 0 }}>
            {agotados.map((p) => <li key={p.id}>{p.nombre}</li>)}
          </ul>
        </Modal>
      )}
    </>
  );
}

function Menu({ modulos, ir, usuario }) {
  // Atajos: teclas 1-9 y 0 abren los primeros módulos.
  useEffect(() => {
    const k = (e) => {
      if (e.target.closest('input,select,textarea') || e.ctrlKey || e.altKey || e.metaKey) return;
      const n = e.key === '0' ? 10 : Number(e.key);
      if (n >= 1 && n <= modulos.length && n <= 10) { e.preventDefault(); ir(modulos[n - 1].id); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [modulos, ir]);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 28 }}>{saludo}, {usuario.nombre.split(' ')[0]}</h1>
        <div className="muted">¿Qué vas a hacer hoy? Toca un botón o usa los números del teclado.</div>
      </div>
      <nav className="menu-grid" aria-label="Menú principal">
        {modulos.map((m, i) => (
          <button key={m.id} className="menu-btn" style={{ '--c': m.color }} onClick={() => ir(m.id)} autoFocus={i === 0}>
            {i < 10 && <span className="menu-key">{i === 9 ? 0 : i + 1}</span>}
            <span className="menu-ico" style={{ background: m.color + '1a', color: m.color }}><m.icono size={34} /></span>
            <span>
              <span className="menu-t" style={{ display: 'block' }}>{m.titulo}</span>
              <span className="menu-d">{m.desc}</span>
            </span>
          </button>
        ))}
      </nav>
    </>
  );
}
