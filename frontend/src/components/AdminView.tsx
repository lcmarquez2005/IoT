import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  User,
  Eye,
  LogOut,
  Plus,
  RefreshCw,
  Truck,
  Layers,
  Users,
  FileText,
  Clock,
  Play,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Sparkles,
  Activity,
  KeyRound,
  X,
} from 'lucide-react';
import {
  UserSession,
  ModeloComercial,
  UnidadFisica,
  ClienteItem,
  SesionInvitado,
  AuditoriaItem,
  DemoDetalleItem,
  DemoPasoEditor,
  Comando,
} from '../types/vehicle';
import {
  loginUser,
  obtenerModelos,
  crearModelo,
  obtenerUnidades,
  crearUnidad,
  asignarUnidad,
  obtenerClientes,
  crearCliente,
  obtenerMisVehiculos,
  obtenerUnidadExhibicion,
  solicitarPruebaInvitado,
  liberarPruebaInvitado,
  verificarSesionInvitado,
  obtenerAuditoria,
  obtenerDemosEditor,
  crearDemoEditor,
  eliminarDemoEditor,
  obtenerComandosVehiculo,
  iniciarDemo,
  verificarSaludRds,
} from '../services/api';

interface AdminViewProps {
  vehiculoId: number;
  setVehiculoId: (id: number) => void;
  setActiveTab: (tab: 'control' | 'monitoring' | 'admin') => void;
  guestSessionToken: string | null;
  setGuestSessionToken: (token: string | null) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  vehiculoId,
  setVehiculoId,
  setActiveTab,
  guestSessionToken,
  setGuestSessionToken,
}) => {
  // Estado de Sesión y Autenticación
  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('IOT_AUTH_SESSION');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Subpestañas del Administrador
  const [adminSubTab, setAdminSubTab] = useState<'dashboard' | 'modelos' | 'unidades' | 'clientes' | 'auditoria'>('dashboard');

  // Datos del Negocio
  const [modelos, setModelos] = useState<ModeloComercial[]>([]);
  const [unidades, setUnidades] = useState<UnidadFisica[]>([]);
  const [clientes, setClientes] = useState<ClienteItem[]>([]);
  const [auditorias, setAuditorias] = useState<AuditoriaItem[]>([]);
  const [misVehiculos, setMisVehiculos] = useState<UnidadFisica[]>([]);
  const [comandosDisponibles, setComandosDisponibles] = useState<Comando[]>([]);

  // Demos en el Editor
  const [demosVehiculo, setDemosVehiculo] = useState<DemoDetalleItem[]>([]);
  const [nuevaDemoNombre, setNuevaDemoNombre] = useState('Mi Secuencia Personalizada');
  const [nuevaDemoDesc, setNuevaDemoDesc] = useState('Secuencia optimizada de excavación');
  const [pasosDemo, setPasosDemo] = useState<DemoPasoEditor[]>([
    { id_comando: 1, duracion_ms: 1500, pausa_ms: 500 },
    { id_comando: 5, duracion_ms: 2000, pausa_ms: 400 },
    { id_comando: 7, duracion_ms: 1200, pausa_ms: 300 },
    { id_comando: 9, duracion_ms: 500, pausa_ms: 0 },
  ]);

  // Sesión de Invitado
  const [exhibicionData, setExhibicionData] = useState<{
    unidad: UnidadFisica | null;
    disponible: boolean;
    sesion_activa?: SesionInvitado | null;
  }>({ unidad: null, disponible: true });
  const [nombreInvitado, setNombreInvitado] = useState('');
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);

  // Modales
  const [showNuevoModeloModal, setShowNuevoModeloModal] = useState(false);
  const [nuevoModeloNombre, setNuevoModeloNombre] = useState('');
  const [nuevoModeloCategoria, setNuevoModeloCategoria] = useState('EXCAVADORA');
  const [nuevoModeloDesc, setNuevoModeloDesc] = useState('');
  const [nuevoModeloFoto, setNuevoModeloFoto] = useState('');

  const [showNuevaUnidadModal, setShowNuevaUnidadModal] = useState(false);
  const [nuevaUnidadNombre, setNuevaUnidadNombre] = useState('');
  const [nuevaUnidadModeloId, setNuevaUnidadModeloId] = useState<number>(1);
  const [nuevaUnidadSerie, setNuevaUnidadSerie] = useState('');
  const [nuevaUnidadEstado, setNuevaUnidadEstado] = useState('DISPONIBLE');

  const [showAsignarModal, setShowAsignarModal] = useState<UnidadFisica | null>(null);
  const [clienteAsignarId, setClienteAsignarId] = useState<number | ''>('');

  const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false);
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('');
  const [nuevoClienteEmail, setNuevoClienteEmail] = useState('');
  const [nuevoClientePassword, setNuevoClientePassword] = useState('Cliente123!');
  const [nuevoClienteEmpresa, setNuevoClienteEmpresa] = useState('');
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState('');

  const [rdsSalud, setRdsSalud] = useState<boolean | null>(null);
  const [loadingGeneral, setLoadingGeneral] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Guardar sesión en localStorage
  useEffect(() => {
    if (session) {
      localStorage.setItem('IOT_AUTH_SESSION', JSON.stringify(session));
      localStorage.setItem('IOT_AUTH_TOKEN', session.token);
    } else {
      localStorage.removeItem('IOT_AUTH_SESSION');
      localStorage.removeItem('IOT_AUTH_TOKEN');
    }
  }, [session]);

  // Carga de catálogo comercial inicial (Público)
  const cargarCatalogosPublicos = useCallback(async () => {
    try {
      const mods = await obtenerModelos();
      setModelos(mods);
      const exh = await obtenerUnidadExhibicion();
      setExhibicionData(exh as any);
      const rdsOk = await verificarSaludRds();
      setRdsSalud(rdsOk);
    } catch (e) {
      console.warn('Error cargando catálogos públicos:', e);
    }
  }, []);

  useEffect(() => {
    cargarCatalogosPublicos();
    const interval = setInterval(cargarCatalogosPublicos, 10000);
    return () => clearInterval(interval);
  }, [cargarCatalogosPublicos]);

  // Cargar comandos para el vehículo actual
  useEffect(() => {
    obtenerComandosVehiculo(vehiculoId)
      .then(setComandosDisponibles)
      .catch(() => {});
  }, [vehiculoId]);

  // Carga de datos según Rol
  const cargarDatosRol = useCallback(async () => {
    if (!session) return;
    setLoadingGeneral(true);
    try {
      if (session.user.rol === 'ADMINISTRADOR') {
        const [mods, units, clients, audits] = await Promise.all([
          obtenerModelos(),
          obtenerUnidades(session.token),
          obtenerClientes(session.token),
          obtenerAuditoria(session.token, 40),
        ]);
        setModelos(mods);
        setUnidades(units);
        setClientes(clients);
        setAuditorias(audits);
      } else if (session.user.rol === 'USUARIO') {
        const misU = await obtenerMisVehiculos(session.token);
        setMisVehiculos(misU);
        if (misU.length > 0 && !misU.some((u) => u.id_vehiculo === vehiculoId)) {
          setVehiculoId(misU[0].id_vehiculo);
        }
        const demos = await obtenerDemosEditor(session.token, vehiculoId);
        setDemosVehiculo(demos);
      }
    } catch (err: any) {
      showFeedback(err.message || 'Error cargando datos de rol', 'error');
    } finally {
      setLoadingGeneral(false);
    }
  }, [session, vehiculoId, setVehiculoId]);

  useEffect(() => {
    cargarDatosRol();
  }, [cargarDatosRol]);

  // Temporizador de Sesión de Invitado
  useEffect(() => {
    if (!guestSessionToken) {
      setSegundosRestantes(null);
      return;
    }

    const timer = setInterval(async () => {
      try {
        const data = await verificarSesionInvitado(guestSessionToken);
        if (data && data.segundos_restantes !== undefined) {
          if (data.segundos_restantes <= 0) {
            setGuestSessionToken(null);
            setSegundosRestantes(null);
            showFeedback('Su turno de prueba temporal ha finalizado. Unidad detenida.', 'error');
          } else {
            setSegundosRestantes(data.segundos_restantes);
          }
        }
      } catch {
        setGuestSessionToken(null);
        setSegundosRestantes(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [guestSessionToken, setGuestSessionToken]);

  // Login manual
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await loginUser(loginEmail, loginPassword);
      setSession(res);
      setShowLoginModal(false);
      showFeedback(`Bienvenido, ${res.user.nombre} (${res.user.rol})`);
    } catch (err: any) {
      setLoginError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoginLoading(false);
    }
  };

  // Selector Rápido de Roles para Pruebas del Docente y Compañeros
  const handleQuickLogin = async (rol: 'ADMIN' | 'CLIENTE' | 'INVITADO') => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      let email = 'admin@empresa-iot.com';
      let pass = 'Admin123!';
      if (rol === 'CLIENTE') {
        email = 'cliente@gmail.com';
        pass = 'Cliente123!';
      } else if (rol === 'INVITADO') {
        email = 'invitado@publico.com';
        pass = 'Invitado123!';
      }
      setLoginEmail(email);
      setLoginPassword(pass);
      const res = await loginUser(email, pass);
      setSession(res);
      showFeedback(`Autenticado rápidamente como ${res.user.rol}`);
    } catch (err: any) {
      setLoginError(err.message || 'Error en inicio rápido');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    showFeedback('Sesión cerrada correctamente');
  };

  // Acciones Administrador: Crear Modelo
  const handleCrearModelo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    try {
      await crearModelo(session.token, {
        nombre: nuevoModeloNombre,
        categoria: nuevoModeloCategoria,
        descripcion: nuevoModeloDesc,
        foto_url: nuevoModeloFoto || 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80',
      });
      showFeedback('Modelo comercial registrado con éxito');
      setShowNuevoModeloModal(false);
      setNuevoModeloNombre('');
      cargarDatosRol();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  // Acciones Administrador: Alta Unidad
  const handleCrearUnidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    try {
      await crearUnidad(session.token, {
        nombre: nuevaUnidadNombre,
        id_modelo: nuevaUnidadModeloId,
        numero_serie: nuevaUnidadSerie,
        estado_comercial: nuevaUnidadEstado,
      });
      showFeedback('Unidad física registrada en inventario');
      setShowNuevaUnidadModal(false);
      setNuevaUnidadNombre('');
      setNuevaUnidadSerie('');
      cargarDatosRol();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  // Acciones Administrador: Asignar Unidad
  const handleAsignarUnidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !showAsignarModal) return;
    try {
      const clienteIdNum = clienteAsignarId === '' ? null : Number(clienteAsignarId);
      const nuevoEstado = clienteIdNum ? 'VENDIDO' : 'DISPONIBLE';
      await asignarUnidad(session.token, showAsignarModal.id_vehiculo, clienteIdNum, nuevoEstado);
      showFeedback(`Unidad #${showAsignarModal.id_vehiculo} asignada correctamente`);
      setShowAsignarModal(null);
      cargarDatosRol();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  // Acciones Administrador: Crear Cliente
  const handleCrearCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    try {
      await crearCliente(session.token, {
        nombre: nuevoClienteNombre,
        email: nuevoClienteEmail,
        password: nuevoClientePassword,
        empresa: nuevoClienteEmpresa,
        telefono: nuevoClienteTelefono,
      });
      showFeedback('Cliente comprador dado de alta');
      setShowNuevoClienteModal(false);
      setNuevoClienteNombre('');
      setNuevoClienteEmail('');
      cargarDatosRol();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  // Acciones Invitado: Solicitar Prueba
  const handleSolicitarPrueba = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreInvitado.trim() || !exhibicionData.unidad) return;
    try {
      const res = await solicitarPruebaInvitado(exhibicionData.unidad.id_vehiculo, nombreInvitado, 3);
      setGuestSessionToken(res.token_sesion);
      setSegundosRestantes(res.segundos_restantes || 180);
      setVehiculoId(exhibicionData.unidad.id_vehiculo);
      showFeedback('¡Turno de prueba concedido! Tienes 3 minutos exclusivos.');
      cargarCatalogosPublicos();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  // Acciones Invitado: Liberar Prueba
  const handleLiberarPrueba = async () => {
    if (!guestSessionToken) return;
    try {
      await liberarPruebaInvitado(guestSessionToken);
      setGuestSessionToken(null);
      setSegundosRestantes(null);
      showFeedback('Turno liberado y vehículo detenido de forma segura');
      cargarCatalogosPublicos();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  // Acciones Usuario: Editor de Demos
  const handleAgregarPaso = () => {
    const primerCmd = comandosDisponibles[0]?.id_comando || 1;
    setPasosDemo([...pasosDemo, { id_comando: primerCmd, duracion_ms: 1500, pausa_ms: 300 }]);
  };

  const handleEliminarPaso = (idx: number) => {
    setPasosDemo(pasosDemo.filter((_, i) => i !== idx));
  };

  const handleMoverPaso = (idx: number, direccion: 'arriba' | 'abajo') => {
    const nuevoIndex = direccion === 'arriba' ? idx - 1 : idx + 1;
    if (nuevoIndex < 0 || nuevoIndex >= pasosDemo.length) return;
    const clon = [...pasosDemo];
    const temp = clon[idx];
    clon[idx] = clon[nuevoIndex];
    clon[nuevoIndex] = temp;
    setPasosDemo(clon);
  };

  const handleGuardarDemo = async () => {
    if (!session || pasosDemo.length === 0) return;
    try {
      await crearDemoEditor(
        session.token,
        vehiculoId,
        nuevaDemoNombre,
        nuevaDemoDesc,
        session.user.rol === 'ADMINISTRADOR' ? 'FABRICA' : 'PRIVADA',
        pasosDemo
      );
      showFeedback('¡Rutina Demo personalizada guardada en RDS exitosamente!');
      cargarDatosRol();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  const handleEliminarDemoGuardada = async (idDemo: number) => {
    if (!session) return;
    try {
      await eliminarDemoEditor(session.token, idDemo);
      showFeedback('Rutina demo eliminada');
      cargarDatosRol();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  const formatTiempo = (seg: number) => {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Notificación Flotante */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-950/90 text-rose-300 border-rose-500/40'
          }`}
        >
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* BARRA SUPERIOR DE SESIÓN Y CONTROL DE ROLES */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 backdrop-blur-md shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Plataforma Comercial IoT</h2>
              {loadingGeneral && <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Práctica 4.3
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {session
                ? `Sesión activa: ${session.user.nombre} (${session.user.rol})`
                : 'Modo invitado / público. Inicia sesión para administrar o editar demos.'}
            </p>
          </div>
        </div>

        {/* SELECTOR RÁPIDO PARA EVALUACIÓN EN EQUIPO (ADMIN | CLIENTE | INVITADO) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-400 font-medium">Cambiar Rol de Prueba:</span>
          <button
            type="button"
            onClick={() => handleQuickLogin('ADMIN')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
              session?.user.rol === 'ADMINISTRADOR'
                ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                : 'bg-slate-800 text-amber-400 border-amber-500/30 hover:bg-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('CLIENTE')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
              session?.user.rol === 'USUARIO'
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-md'
                : 'bg-slate-800 text-cyan-400 border-cyan-500/30 hover:bg-slate-700'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Cliente</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleLogout();
              handleQuickLogin('INVITADO');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
              session?.user.rol === 'INVITADO' || !session
                ? 'bg-purple-500 text-white border-purple-400 shadow-md'
                : 'bg-slate-800 text-purple-400 border-purple-500/30 hover:bg-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Invitado</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1"
            title="Iniciar sesión con credenciales propias"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Login</span>
          </button>

          {session && (
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-400 hover:bg-rose-900/60 transition-colors cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          VISTA 1: ADMINISTRADOR DE LA EMPRESA (ROL: ADMINISTRADOR)
          ========================================================================= */}
      {session?.user.rol === 'ADMINISTRADOR' && (
        <div className="space-y-4">
          {/* Navegación Interna de Administración */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
            <button
              onClick={() => setAdminSubTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                adminSubTab === 'dashboard' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Dashboard Comercial</span>
            </button>
            <button
              onClick={() => setAdminSubTab('modelos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                adminSubTab === 'modelos' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Modelos ({modelos.length})</span>
            </button>
            <button
              onClick={() => setAdminSubTab('unidades')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                adminSubTab === 'unidades' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Unidades Físicas ({unidades.length})</span>
            </button>
            <button
              onClick={() => setAdminSubTab('clientes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                adminSubTab === 'clientes' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Clientes ({clientes.length})</span>
            </button>
            <button
              onClick={() => setAdminSubTab('auditoria')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                adminSubTab === 'auditoria' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Auditoría ({auditorias.length})</span>
            </button>
          </div>

          {/* 1.1 DASHBOARD DE MÉTRICAS */}
          {adminSubTab === 'dashboard' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-md">
                  <span className="text-[11px] text-slate-400 font-medium">Total Unidades</span>
                  <div className="text-xl font-bold text-white mt-1">{unidades.length}</div>
                  <span className="text-[10px] text-amber-400">Inventario físico</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-md">
                  <span className="text-[11px] text-slate-400 font-medium">Exhibición Pública</span>
                  <div className="text-xl font-bold text-purple-400 mt-1">
                    {unidades.filter((u) => u.estado_comercial === 'EXHIBICION').length}
                  </div>
                  <span className="text-[10px] text-slate-500">Para prospectos</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-md">
                  <span className="text-[11px] text-slate-400 font-medium">Unidades Vendidas</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    {unidades.filter((u) => u.estado_comercial === 'VENDIDO').length}
                  </div>
                  <span className="text-[10px] text-emerald-500/80">Operadas por clientes</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-md">
                  <span className="text-[11px] text-slate-400 font-medium">Clientes Compradores</span>
                  <div className="text-xl font-bold text-cyan-400 mt-1">{clientes.length}</div>
                  <span className="text-[10px] text-cyan-500/80">Cuentas activas</span>
                </div>
              </div>

              {/* Estado de Servicios e Infraestructura */}
              <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-4 shadow-md">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  Salud de Infraestructura AWS y Base de Datos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Amazon RDS MySQL</div>
                      <div className="text-[11px] text-slate-400">database-1 (us-east-1)</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rdsSalud ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-rose-950 text-rose-400'
                      }`}
                    >
                      {rdsSalud ? 'Disponible' : 'Error'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">AWS EC2 Backend</div>
                      <div className="text-[11px] text-slate-400">FastAPI TLS Port 443</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                      Activo (21+ APIs)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Firmware ESP32</div>
                      <div className="text-[11px] text-slate-400">Canal WSS Bidireccional</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                      Modo Continuo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1.2 CATÁLOGO DE MODELOS */}
          {adminSubTab === 'modelos' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Modelos Comerciales Registrados
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNuevoModeloModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Modelo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {modelos.map((m) => (
                  <div
                    key={m.id_modelo}
                    className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md flex flex-col justify-between"
                  >
                    <div>
                      {m.foto_url && (
                        <div className="h-36 w-full overflow-hidden bg-slate-950 relative">
                          <img
                            src={m.foto_url}
                            alt={m.nombre}
                            className="w-full h-full object-cover opacity-85 hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-amber-400 border border-amber-500/30">
                            {m.categoria}
                          </span>
                        </div>
                      )}
                      <div className="p-3.5">
                        <h4 className="text-sm font-bold text-white">{m.nombre}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{m.descripcion}</p>

                        {m.especificaciones && typeof m.especificaciones === 'object' && (
                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                            {Object.entries(m.especificaciones).map(([k, v]) => (
                              <span
                                key={k}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800"
                              >
                                <strong>{k}:</strong> {String(v)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="px-3.5 pb-3 pt-1 text-[11px] text-slate-500 font-mono">
                      ID Modelo: #{m.id_modelo}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 1.3 INVENTARIO DE UNIDADES FÍSICAS */}
          {adminSubTab === 'unidades' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Inventario de Unidades Físicas
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNuevaUnidadModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Alta de Unidad</span>
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow-md">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">ID</th>
                      <th className="p-2.5">Nombre / Serie</th>
                      <th className="p-2.5">Modelo Comercial</th>
                      <th className="p-2.5">Estado Comercial</th>
                      <th className="p-2.5">Propietario Asignado</th>
                      <th className="p-2.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {unidades.map((u) => (
                      <tr key={u.id_vehiculo} className="hover:bg-slate-800/40">
                        <td className="p-2.5 text-amber-400 font-bold">#{u.id_vehiculo}</td>
                        <td className="p-2.5">
                          <div className="font-bold text-white font-sans">{u.nombre}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{u.numero_serie || 'S/N no asignado'}</div>
                        </td>
                        <td className="p-2.5 text-slate-300 font-sans">{u.modelo_nombre || 'Modelo genérico'}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.estado_comercial === 'EXHIBICION'
                                ? 'bg-purple-950 text-purple-400 border border-purple-500/30'
                                : u.estado_comercial === 'VENDIDO'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : 'bg-cyan-950 text-cyan-400 border border-cyan-500/30'
                            }`}
                          >
                            {u.estado_comercial}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-300 font-sans">
                          {u.propietario_nombre ? (
                            <div>
                              <div className="font-bold">{u.propietario_nombre}</div>
                              <div className="text-[10px] text-slate-400">{u.propietario_email}</div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Empresa comercializadora</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => setShowAsignarModal(u)}
                            className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 hover:bg-amber-500 hover:text-black hover:border-amber-400 transition-colors font-sans text-[11px] font-semibold cursor-pointer"
                          >
                            Asignar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 1.4 DIRECTORIO DE CLIENTES */}
          {adminSubTab === 'clientes' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Clientes Compradores Registrados
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNuevoClienteModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Cliente</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {clientes.map((c) => (
                  <div
                    key={c.id_usuario}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-white">{c.nombre}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{c.email}</p>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Empresa: <strong>{c.empresa || 'Particular'}</strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-1 rounded-lg bg-cyan-950 border border-cyan-500/30 text-cyan-400 text-xs font-bold font-mono">
                        {c.total_vehiculos || 0} Vehículos
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 1.5 AUDITORÍA DEL SISTEMA */}
          {adminSubTab === 'auditoria' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Bitácora de Auditoría y Seguridad en Tiempo Real
                </h3>
                <button
                  onClick={cargarDatosRol}
                  className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                  title="Actualizar"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow-md max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-2">Hora</th>
                      <th className="p-2">Acción</th>
                      <th className="p-2">Usuario</th>
                      <th className="p-2">Entidad</th>
                      <th className="p-2">Detalle</th>
                      <th className="p-2">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {auditorias.map((a) => (
                      <tr key={a.id_auditoria} className="hover:bg-slate-800/30">
                        <td className="p-2 text-slate-400">{new Date(a.fecha_hora).toLocaleTimeString()}</td>
                        <td className="p-2 font-bold text-amber-400">{a.accion}</td>
                        <td className="p-2 text-slate-300 font-sans">{a.usuario_nombre || 'Invitado/Público'}</td>
                        <td className="p-2 text-slate-400">{a.entidad}</td>
                        <td className="p-2 text-slate-400 max-w-xs truncate">{JSON.stringify(a.detalle || {})}</td>
                        <td className="p-2 text-slate-500">{a.ip || '127.0.0.1'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VISTA 2: USUARIO COMPRADOR (ROL: USUARIO)
          ========================================================================= */}
      {session?.user.rol === 'USUARIO' && (
        <div className="space-y-4">
          {/* Tarjeta de Vehículos Propios */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-cyan-400" />
              Mis Unidades Asignadas ({misVehiculos.length})
            </h3>
            {misVehiculos.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                Aún no tienes vehículos asignados a tu cuenta. El Administrador te asignará una unidad adquirida.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {misVehiculos.map((v) => (
                  <div
                    key={v.id_vehiculo}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      vehiculoId === v.id_vehiculo
                        ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                    onClick={() => setVehiculoId(v.id_vehiculo)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{v.nombre}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                        Unidad #{v.id_vehiculo}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Serie: <strong className="font-mono text-slate-300">{v.numero_serie || 'N/A'}</strong>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVehiculoId(v.id_vehiculo);
                          setActiveTab('control');
                        }}
                        className="px-2.5 py-1 rounded bg-cyan-500 text-black text-xs font-bold hover:bg-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Manejar (Control)</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVehiculoId(v.id_vehiculo);
                          setActiveTab('monitoring');
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        Telemetría
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EDITOR VISUAL INTERACTIVO DE DEMOS PRIVADAS */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Editor Visual de Rutinas Demo Personalizadas
                </h3>
                <p className="text-xs text-slate-400">
                  Diseña, reordena y programa secuencias de movimiento automatizadas para tu vehículo #{vehiculoId}.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGuardarDemo}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Guardar Rutina en RDS</span>
              </button>
            </div>

            {/* Metadatos de la Rutina */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Nombre de la Rutina:</label>
                <input
                  type="text"
                  value={nuevaDemoNombre}
                  onChange={(e) => setNuevaDemoNombre(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Descripción Funcional:</label>
                <input
                  type="text"
                  value={nuevaDemoDesc}
                  onChange={(e) => setNuevaDemoDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Constructor de Secuencia (Pasos Ordenados) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Pasos de la Secuencia ({pasosDemo.length}):</span>
                <button
                  type="button"
                  onClick={handleAgregarPaso}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Movimiento</span>
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {pasosDemo.map((paso, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 font-mono font-bold flex items-center justify-center text-[11px] border border-slate-800">
                        {idx + 1}
                      </span>
                      <select
                        value={paso.id_comando}
                        onChange={(e) => {
                          const clon = [...pasosDemo];
                          clon[idx].id_comando = Number(e.target.value);
                          setPasosDemo(clon);
                        }}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                      >
                        {comandosDisponibles.map((cmd) => (
                          <option key={cmd.id_comando} value={cmd.id_comando}>
                            {cmd.nombre} (Cod: {cmd.codigo})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">Duración:</span>
                        <input
                          type="number"
                          step={100}
                          min={200}
                          max={10000}
                          value={paso.duracion_ms}
                          onChange={(e) => {
                            const clon = [...pasosDemo];
                            clon[idx].duracion_ms = Number(e.target.value);
                            setPasosDemo(clon);
                          }}
                          className="w-16 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-center font-mono text-[11px] text-amber-300"
                        />
                        <span className="text-[10px] text-slate-500">ms</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">Pausa:</span>
                        <input
                          type="number"
                          step={100}
                          min={0}
                          max={5000}
                          value={paso.pausa_ms}
                          onChange={(e) => {
                            const clon = [...pasosDemo];
                            clon[idx].pausa_ms = Number(e.target.value);
                            setPasosDemo(clon);
                          }}
                          className="w-14 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-center font-mono text-[11px] text-cyan-300"
                        />
                        <span className="text-[10px] text-slate-500">ms</span>
                      </div>

                      {/* Botones de Reordenamiento */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoverPaso(idx, 'arriba')}
                          disabled={idx === 0}
                          className="p-1 rounded bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30"
                          title="Subir"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoverPaso(idx, 'abajo')}
                          disabled={idx === pasosDemo.length - 1}
                          className="p-1 rounded bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30"
                          title="Bajar"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarPaso(idx)}
                          className="p-1 rounded bg-rose-950/60 text-rose-400 hover:bg-rose-900"
                          title="Eliminar paso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rutinas Guardadas del Vehículo */}
            <div className="border-t border-slate-800 pt-3">
              <h4 className="text-xs font-bold text-slate-300 mb-2">Rutinas Registradas en Amazon RDS:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {demosVehiculo.map((d) => (
                  <div
                    key={d.id_demo}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{d.nombre}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            d.tipo_demo === 'FABRICA'
                              ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                              : 'bg-cyan-950 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          {d.tipo_demo}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {d.movimientos.length} pasos programados
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await iniciarDemo(vehiculoId, d.id_demo);
                            showFeedback(`Rutina "${d.nombre}" ejecutándose`);
                          } catch (e: any) {
                            showFeedback(e.message, 'error');
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Ejecutar</span>
                      </button>
                      {d.tipo_demo === 'PRIVADA' && (
                        <button
                          type="button"
                          onClick={() => handleEliminarDemoGuardada(d.id_demo)}
                          className="p-1 rounded bg-rose-950/60 text-rose-400 hover:bg-rose-900"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VISTA 3: INVITADO / PROSPECTO COMERCIAL (PÚBLICO O ROL INVITADO)
          ========================================================================= */}
      {(!session || session.user.rol === 'INVITADO') && (
        <div className="space-y-4">
          {/* MÓDULO DE PRUEBA EXCLUSIVA DE EXHIBICIÓN */}
          <div className="bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/30 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  Demostración Comercial Pública
                </span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-purple-400" />
                  Prueba de Conducción Temporal Exclusiva
                </h3>
              </div>

              {/* Indicador de Disponibilidad */}
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                  exhibicionData.disponible
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-950/80 text-amber-400 border-amber-500/30 animate-pulse'
                }`}
              >
                {exhibicionData.disponible ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Unidad de Exhibición Disponible</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>En uso por otro prospecto</span>
                  </>
                )}
              </span>
            </div>

            {/* CASO A: EL USUARIO YA TIENE EL TURNO ACTIVO */}
            {guestSessionToken && segundosRestantes !== null ? (
              <div className="p-4 rounded-xl bg-purple-900/30 border border-purple-500/40 text-center space-y-3">
                <div className="text-xs text-purple-200 font-semibold">
                  ¡Tienes el control exclusivo de la unidad de exhibición!
                </div>
                <div className="text-4xl font-mono font-bold text-amber-400 tracking-wider">
                  {formatTiempo(segundosRestantes)}
                </div>
                <p className="text-xs text-slate-300">
                  El sistema bloqueará comandos de otros usuarios hasta que tu tiempo expire o liberes la unidad.
                </p>
                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('control')}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>Ir al Control Remoto</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLiberarPrueba}
                    className="px-4 py-2 rounded-xl bg-rose-950 text-rose-300 border border-rose-500/40 text-xs font-bold hover:bg-rose-900 transition-colors cursor-pointer"
                  >
                    Liberar Turno y Detener Seguro
                  </button>
                </div>
              </div>
            ) : exhibicionData.disponible ? (
              /* CASO B: UNIDAD LIBRE, FORMULARIO DE SOLICITUD */
              <form onSubmit={handleSolicitarPrueba} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <p className="text-xs text-slate-300">
                  Solicita una sesión temporal de 3 minutos para probar el vehículo real con joystick y movimientos físicos sin costo.
                </p>
                <div className="flex items-center gap-2 max-w-md">
                  <input
                    type="text"
                    required
                    placeholder="Escribe tu nombre o apodo..."
                    value={nombreInvitado}
                    onChange={(e) => setNombreInvitado(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Iniciar Prueba</span>
                  </button>
                </div>
              </form>
            ) : (
              /* CASO C: UNIDAD OCUPADA POR OTRO USUARIO */
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-center space-y-2">
                <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
                <div className="text-xs font-bold text-amber-300">
                  La unidad está siendo operada en exclusiva por otro prospecto
                </div>
                <p className="text-xs text-slate-400">
                  Por seguridad comercial y para evitar colisiones cruzadas, solo una persona puede mover el vehículo a la vez. Espera a que termine su turno.
                </p>
              </div>
            )}
          </div>

          {/* CATÁLOGO COMERCIAL PÚBLICO */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400" />
              Catálogo Comercial de Vehículos IoT
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modelos.map((m) => (
                <div key={m.id_modelo} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                  {m.foto_url && (
                    <div className="h-44 w-full overflow-hidden bg-slate-950">
                      <img src={m.foto_url} alt={m.nombre} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">{m.nombre}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                        {m.categoria}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{m.descripcion}</p>

                    {m.especificaciones && typeof m.especificaciones === 'object' && (
                      <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
                        {Object.entries(m.especificaciones).map(([k, v]) => (
                          <span
                            key={k}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800"
                          >
                            <strong>{k}:</strong> {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ALTA DE MODELO */}
      {showNuevoModeloModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <form onSubmit={handleCrearModelo} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-white">Dar de Alta Nuevo Modelo Comercial</h3>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Nombre Comercial:</label>
              <input
                type="text"
                required
                value={nuevoModeloNombre}
                onChange={(e) => setNuevoModeloNombre(e.target.value)}
                placeholder="Ej. Excavadora Hidráulica X-300"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Categoría:</label>
              <select
                value={nuevoModeloCategoria}
                onChange={(e) => setNuevoModeloCategoria(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
              >
                <option value="EXCAVADORA">EXCAVADORA</option>
                <option value="ROVER">ROVER / EXPLORADOR</option>
                <option value="MONTACARGAS">MONTACARGAS</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Descripción:</label>
              <textarea
                value={nuevoModeloDesc}
                onChange={(e) => setNuevoModeloDesc(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">URL de Foto:</label>
              <input
                type="url"
                value={nuevoModeloFoto}
                onChange={(e) => setNuevoModeloFoto(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNuevoModeloModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold cursor-pointer hover:bg-amber-400"
              >
                Guardar Modelo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ALTA DE UNIDAD */}
      {showNuevaUnidadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <form onSubmit={handleCrearUnidad} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-white">Dar de Alta Unidad Física</h3>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Nombre / Identificador:</label>
              <input
                type="text"
                required
                value={nuevaUnidadNombre}
                onChange={(e) => setNuevaUnidadNombre(e.target.value)}
                placeholder="Ej. Excavadora IoT Unidad 2"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Modelo Comercial:</label>
              <select
                value={nuevaUnidadModeloId}
                onChange={(e) => setNuevaUnidadModeloId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
              >
                {modelos.map((m) => (
                  <option key={m.id_modelo} value={m.id_modelo}>
                    {m.nombre} ({m.categoria})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Número de Serie Único:</label>
              <input
                type="text"
                required
                value={nuevaUnidadSerie}
                onChange={(e) => setNuevaUnidadSerie(e.target.value)}
                placeholder="Ej. EXC-X200-002"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Estado Comercial:</label>
              <select
                value={nuevaUnidadEstado}
                onChange={(e) => setNuevaUnidadEstado(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
              >
                <option value="DISPONIBLE">DISPONIBLE</option>
                <option value="EXHIBICION">EXHIBICION</option>
                <option value="VENDIDO">VENDIDO</option>
                <option value="MANTENIMIENTO">MANTENIMIENTO</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNuevaUnidadModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold cursor-pointer hover:bg-amber-400"
              >
                Registrar Unidad
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ASIGNAR UNIDAD */}
      {showAsignarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <form onSubmit={handleAsignarUnidad} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-white">
              Asignar Unidad #{showAsignarModal.id_vehiculo} ({showAsignarModal.nombre})
            </h3>
            <p className="text-xs text-slate-400">
              Selecciona el cliente comprador al cual pertenecerá esta unidad. Al asignar, el estado cambiará a VENDIDO.
            </p>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Cliente Comprador:</label>
              <select
                value={clienteAsignarId}
                onChange={(e) => setClienteAsignarId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
              >
                <option value="">-- Sin propietario (Empresa) --</option>
                {clientes.map((c) => (
                  <option key={c.id_usuario} value={c.id_usuario}>
                    {c.nombre} ({c.email}) - {c.empresa || 'Particular'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAsignarModal(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold cursor-pointer hover:bg-amber-400"
              >
                Confirmar Asignación
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ALTA DE CLIENTE */}
      {showNuevoClienteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <form onSubmit={handleCrearCliente} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-white">Registrar Nuevo Cliente Comprador</h3>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Nombre Completo:</label>
              <input
                type="text"
                required
                value={nuevoClienteNombre}
                onChange={(e) => setNuevoClienteNombre(e.target.value)}
                placeholder="Ej. Ing. Laura Gómez"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Correo Electrónico:</label>
              <input
                type="email"
                required
                value={nuevoClienteEmail}
                onChange={(e) => setNuevoClienteEmail(e.target.value)}
                placeholder="cliente@constructora.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Contraseña Inicial:</label>
              <input
                type="text"
                required
                value={nuevoClientePassword}
                onChange={(e) => setNuevoClientePassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Empresa / Razón Social:</label>
              <input
                type="text"
                value={nuevoClienteEmpresa}
                onChange={(e) => setNuevoClienteEmpresa(e.target.value)}
                placeholder="Ej. Minera del Centro S.A."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Teléfono:</label>
              <input
                type="text"
                value={nuevoClienteTelefono}
                onChange={(e) => setNuevoClienteTelefono(e.target.value)}
                placeholder="+52 55 1234 5678"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNuevoClienteModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold cursor-pointer hover:bg-amber-400"
              >
                Guardar Cliente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: LOGIN MANUAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                Iniciar Sesión
              </h3>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {loginError && (
              <div className="p-2 rounded bg-rose-950/80 border border-rose-500/30 text-rose-300 text-xs font-medium">
                {loginError}
              </div>
            )}
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Correo Electrónico:</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@empresa-iot.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Contraseña:</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loginLoading}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold cursor-pointer hover:bg-amber-400 disabled:opacity-50 flex items-center gap-1.5"
              >
                {loginLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Entrar</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
