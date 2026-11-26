// Componentes reutilizables de la interfaz.
import { createContext, forwardRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { focusNext, norm } from './utils.js';

/* ---------- Avisos (toasts) ---------- */
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [lista, setLista] = useState([]);
  const avisar = useCallback((msg, tipo = 'ok') => {
    const id = Math.random();
    setLista((l) => [...l, { id, msg, tipo }]);
    setTimeout(() => setLista((l) => l.filter((t) => t.id !== id)), tipo === 'bad' ? 5000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={avisar}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {lista.map((t) => (
          <div key={t.id} className={`toast ${t.tipo}`}>
            {t.tipo === 'ok' ? <CheckCircle2 size={20} /> : t.tipo === 'bad' ? <AlertTriangle size={20} /> : <Info size={20} />}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useAviso = () => useContext(ToastCtx);

// Ejecuta una acción del store (local o del servidor) y muestra el error de negocio como aviso.
// Devuelve una promesa con el resultado, o false si falló. Mientras una acción está en curso,
// ignora otra igual (evita guardar dos veces la misma factura con doble Enter o F9).
export function useAccion() {
  const avisar = useAviso();
  const ocupado = useRef(false);
  return useCallback(async (fn, okMsg) => {
    if (ocupado.current) return false;
    ocupado.current = true;
    try {
      const r = await fn();
      if (okMsg) avisar(okMsg, 'ok');
      return r ?? true;
    } catch (e) {
      avisar(e.message || 'Algo salió mal', 'bad');
      return false;
    } finally {
      ocupado.current = false;
    }
  }, [avisar]);
}

/* ---------- Botones y campos ---------- */
export const Btn = forwardRef(function Btn({ variant = 'ghost', size, icon: Icon, children, className = '', ...p }, ref) {
  return (
    <button ref={ref} type="button" className={`btn btn-${variant} ${size ? 'btn-' + size : ''} ${className}`} {...p}>
      {Icon && <Icon size={size === 'sm' ? 16 : 20} />}
      {children}
    </button>
  );
});

export function Field({ label, hint, children, style }) {
  return (
    <label style={{ display: 'block', ...style }}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <div className="hint">{hint}</div>}
    </label>
  );
}

// Campo de texto. Enter pasa al siguiente campo (data-nav) salvo que se pase onEnter.
export const Input = forwardRef(function Input({ onEnter, onKeyDown, className = '', nav = true, ...p }, ref) {
  return (
    <input
      ref={ref}
      className={`input ${className}`}
      data-nav={nav ? '' : undefined}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          if (onEnter) onEnter(e);
          else focusNext(e.currentTarget);
        }
      }}
      {...p}
    />
  );
});

export const Select = forwardRef(function Select({ children, className = '', onEnter, ...p }, ref) {
  return (
    <select
      ref={ref}
      className={`input ${className}`}
      data-nav=""
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (onEnter) onEnter(e);
          else focusNext(e.currentTarget);
        }
      }}
      {...p}
    >
      {children}
    </select>
  );
});

/* ---------- Autocompletado navegable con flechas + Enter ---------- */
// options: [{ id, label, sub }]. Si allowNew, Enter con texto nuevo llama onCreate(texto).
export const Autocomplete = forwardRef(function Autocomplete(
  { value, onText, options, onSelect, placeholder, allowNew, onCreate, onEnterEmpty, max = 8, inputClass = '', autoFocus, disabled },
  ref
) {
  const [abierto, setAbierto] = useState(false);
  const [idx, setIdx] = useState(0);
  const listRef = useRef(null);
  const filtradas = useMemo(() => {
    const q = norm(value);
    const base = q ? options.filter((o) => norm(o.label).includes(q) || norm(o.sub).includes(q)) : options;
    // primero los que empiezan con el texto
    return [...base].sort((a, b) => (norm(b.label).startsWith(q) ? 1 : 0) - (norm(a.label).startsWith(q) ? 1 : 0)).slice(0, max);
  }, [value, options, max]);
  const existeExacto = options.some((o) => norm(o.label) === norm(value));
  const mostrarNuevo = allowNew && value?.trim() && !existeExacto;
  const total = filtradas.length + (mostrarNuevo ? 1 : 0);

  useEffect(() => { setIdx(0); }, [value]);
  useEffect(() => {
    listRef.current?.children[idx]?.scrollIntoView?.({ block: 'nearest' });
  }, [idx]);

  const elegir = (i, input) => {
    flushSync(() => {
      if (i < filtradas.length) onSelect(filtradas[i]);
      else if (mostrarNuevo) onCreate?.(value.trim());
      setAbierto(false);
    });
    if (input && (i < filtradas.length)) focusNext(input);
  };

  return (
    <div className="ac">
      <input
        ref={ref}
        className={`input ${inputClass}`}
        data-nav=""
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={abierto}
        onChange={(e) => { onText(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setIdx((i) => Math.min(i + 1, total - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
          else if (e.key === 'Escape') { setAbierto(false); }
          else if (e.key === 'Enter') {
            e.preventDefault();
            if (!value?.trim()) { setAbierto(false); if (onEnterEmpty) onEnterEmpty(e.currentTarget); else focusNext(e.currentTarget); return; }
            if (abierto && total > 0) elegir(idx, e.currentTarget);
            else focusNext(e.currentTarget);
          }
        }}
      />
      {abierto && !disabled && (value?.trim() || options.length < 40) && (
        <div className="ac-list" ref={listRef} role="listbox">
          {filtradas.map((o, i) => (
            <div key={o.id} className={`ac-item ${i === idx ? 'on' : ''}`} onMouseDown={(e) => { e.preventDefault(); elegir(i); }} onMouseEnter={() => setIdx(i)} role="option" aria-selected={i === idx}>
              <span>{o.label}</span>
              {o.sub && <span className="sub">{o.sub}</span>}
            </div>
          ))}
          {mostrarNuevo && (
            <div className={`ac-item ${idx === filtradas.length ? 'on' : ''}`} onMouseDown={(e) => { e.preventDefault(); elegir(filtradas.length); }}>
              <span>+ Crear “{value.trim()}”</span>
            </div>
          )}
          {total === 0 && <div className="ac-empty">No hay coincidencias</div>}
        </div>
      )}
    </div>
  );
});

/* ---------- Modal ---------- */
export function Modal({ title, icon: Icon, color, onClose, children, footer, width = 560 }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-h">
          {Icon && <Icon size={24} color={color || 'var(--primary)'} />}
          <h3 style={{ fontSize: 19 }}>{title}</h3>
          <div className="spacer" />
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={22} /></button>
        </div>
        <div className="modal-b" data-navscope="">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  );
}

// Modal que pide un motivo obligatorio antes de confirmar.
export function MotivoModal({ title, texto, confirmar = 'Confirmar', variant = 'bad', onClose, onOk }) {
  const [motivo, setMotivo] = useState('');
  const ok = () => motivo.trim() && onOk(motivo.trim());
  return (
    <Modal title={title} icon={AlertTriangle} color="var(--bad)" onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant={variant} disabled={!motivo.trim()} onClick={ok}>{confirmar}</Btn></>}>
      {texto && <p className="muted" style={{ marginTop: 0 }}>{texto}</p>}
      <Field label="Motivo (obligatorio)">
        <Input autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} onEnter={ok} placeholder="Escribe por qué" />
      </Field>
    </Modal>
  );
}

/* ---------- Encabezado de página ---------- */
export function PageHeader({ modulo, titulo, children }) {
  const Icon = modulo?.icono;
  return (
    <div className="page-h">
      {Icon && <div className="page-icon" style={{ background: modulo.color }}><Icon size={28} /></div>}
      <div>
        <h1 style={{ fontSize: 26 }}>{titulo || modulo?.titulo}</h1>
        {modulo?.desc && <div className="muted">{modulo.desc}</div>}
      </div>
      <div className="spacer" />
      <div className="row">{children}</div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange, color }) {
  return (
    <div className="tabs" role="tablist" style={{ '--tab-color': color }}>
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={`tab ${value === t.id ? 'on' : ''}`} onClick={() => onChange(t.id)}>
          {t.icon && <t.icon size={18} />}{t.label}
        </button>
      ))}
    </div>
  );
}

export function Estado({ activo }) {
  return activo ? <span className="badge b-ok">Activo</span> : <span className="badge b-neutral">Inactivo</span>;
}

export function Vacio({ children }) {
  return <div className="card muted" style={{ textAlign: 'center', padding: 30 }}>{children}</div>;
}
