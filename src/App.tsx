import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Edit3,
  KeyRound,
  LoaderCircle,
  LogOut,
  Plus,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import { CLASS_NAMES } from './classNames'
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  addMonths,
  compareActivities,
  dateKey,
  getMonthMatrix,
  isToday,
  matchesSearch,
} from './calendar'
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_TYPE_LABELS,
  type Activity,
  type ActivityInput,
  type ActivityType,
  type AdminProfile,
} from './types'

const TURMA_STORAGE_KEY = 'agenda:turma'

const emptyForm: Omit<ActivityInput, 'turmaId'> = {
  title: '',
  description: '',
  type: 'tarefa',
  date: dateKey(new Date()),
  time: null,
}

function readStoredTurma(): string | null {
  try {
    const value = window.localStorage.getItem(TURMA_STORAGE_KEY)
    return value && (CLASS_NAMES as readonly string[]).includes(value) ? value : null
  } catch {
    return null
  }
}

function App() {
  const [turmaId, setTurmaId] = useState<string | null>(readStoredTurma)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [adminOpen, setAdminOpen] = useState(window.location.hash === '#admin')

  function chooseTurma(value: string) {
    setTurmaId(value)
    try {
      window.localStorage.setItem(TURMA_STORAGE_KEY, value)
    } catch {
      // localStorage indisponível (modo privado etc.) — a escolha só vale para esta sessão.
    }
  }

  useEffect(() => {
    if (!turmaId) {
      setActivities([])
      setLoading(false)
      return
    }
    setLoading(true)
    const activitiesQuery = query(collection(db, 'activities'), where('turmaId', '==', turmaId))
    return onSnapshot(
      activitiesQuery,
      (snapshot) => {
        setActivities(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Activity))
        setLoading(false)
        setLoadError('')
      },
      () => {
        setLoading(false)
        setLoadError('Não foi possível carregar a agenda. Confira a conexão e as regras do Firestore.')
      },
    )
  }, [turmaId])

  const activitiesByDay = useMemo(() => {
    const map = new Map<string, Activity[]>()
    for (const activity of activities) {
      const list = map.get(activity.date) ?? []
      list.push(activity)
      map.set(activity.date, list)
    }
    for (const list of map.values()) list.sort(compareActivities)
    return map
  }, [activities])

  const weeks = useMemo(() => getMonthMatrix(monthCursor.getFullYear(), monthCursor.getMonth()), [monthCursor])

  const openAdmin = () => {
    window.location.hash = 'admin'
    setAdminOpen(true)
  }

  const closeAdmin = () => {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    setAdminOpen(false)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          type="button"
          className="admin-trigger"
          aria-label="Abrir área administrativa"
          aria-haspopup="dialog"
          title="Área administrativa"
          onClick={openAdmin}
        >
          <KeyRound size={20} strokeWidth={2.3} aria-hidden="true" />
        </button>
        <a className="brand" href="#inicio" aria-label="Agenda da turma — início">
          <span className="brand-mark"><Calendar size={21} strokeWidth={2.3} /></span>
          <span>Agenda da turma</span>
        </a>
      </header>

      <main id="inicio" className="main-content">
        <div className="agenda-toolbar">
          <div className="agenda-heading">
            <h1>Sua agenda</h1>
            <label className="turma-select-inline" aria-label="Turma selecionada">
              <select value={turmaId ?? ''} onChange={(event) => chooseTurma(event.target.value)}>
                <option value="" disabled>Selecione uma turma</option>
                {CLASS_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
          </div>

          <div className="month-nav">
            <button type="button" onClick={() => setMonthCursor((current) => addMonths(current, -1))} aria-label="Mês anterior"><ChevronLeft /></button>
            <div className="month-nav-title">
              <strong>{MONTH_LABELS[monthCursor.getMonth()]} {monthCursor.getFullYear()}</strong>
              <button type="button" className="today-button" onClick={() => setMonthCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Hoje</button>
            </div>
            <button type="button" onClick={() => setMonthCursor((current) => addMonths(current, 1))} aria-label="Próximo mês"><ChevronRight /></button>
          </div>
        </div>

        <section className="calendar-section" aria-label="Calendário mensal">
          {!turmaId ? (
            <div className="state-card"><Calendar /><p>Escolha sua turma para ver a agenda.</p></div>
          ) : loading ? (
            <div className="state-card"><LoaderCircle className="spin" /><p>Consultando a agenda…</p></div>
          ) : loadError ? (
            <div className="state-card error"><DoorOpen /><p>{loadError}</p></div>
          ) : (
            <div className="calendar-grid">
              <div className="calendar-weekdays">{WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}</div>
              {weeks.map((week, weekIndex) => (
                <div className="calendar-week" key={weekIndex}>
                  {week.map((day) => {
                    const key = dateKey(day)
                    const dayActivities = activitiesByDay.get(key) ?? []
                    const outside = day.getMonth() !== monthCursor.getMonth()
                    const visible = dayActivities.slice(0, 2)
                    const overflow = dayActivities.length - visible.length
                    return (
                      <button
                        type="button"
                        key={key}
                        className={`calendar-day ${outside ? 'outside' : ''} ${isToday(day) ? 'today' : ''}`}
                        onClick={() => dayActivities.length > 0 && setSelectedDay(day)}
                        disabled={dayActivities.length === 0}
                      >
                        <span className="day-number">{day.getDate()}</span>
                        <span className="day-chips">
                          {visible.map((activity) => (
                            <span key={activity.id} className="activity-chip">
                              <span className="chip-dot" style={{ background: ACTIVITY_TYPE_COLORS[activity.type] }} />
                              <span className="chip-label">{activity.title}</span>
                            </span>
                          ))}
                          {overflow > 0 && <span className="chip-overflow">+{overflow}</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {selectedDay && (
        <DayDetail day={selectedDay} activities={activitiesByDay.get(dateKey(selectedDay)) ?? []} onClose={() => setSelectedDay(null)} />
      )}

      {!turmaId && <TurmaPickerModal onChoose={chooseTurma} />}

      {adminOpen && <AdminDialog publicTurmaId={turmaId} onClose={closeAdmin} />}
    </div>
  )
}

function TurmaPickerModal({ onChoose }: { onChoose: (turmaId: string) => void }) {
  const [search, setSearch] = useState('')
  const options = CLASS_NAMES.filter((name) => name.toLowerCase().includes(search.trim().toLowerCase()))
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="turma-picker" role="dialog" aria-modal="true" aria-labelledby="turma-picker-title">
        <div className="login-symbol"><Calendar /></div>
        <h3 id="turma-picker-title">Qual é a sua turma?</h3>
        <p>O app vai lembrar essa escolha no seu navegador. Você pode trocar de turma quando quiser pelo seletor no topo da página.</p>
        <input
          aria-label="Buscar turma"
          placeholder="Buscar turma"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          autoFocus
        />
        <div className="turma-options">
          {options.length === 0 ? <p className="admin-empty">Nenhuma turma encontrada.</p> : options.map((name) => (
            <button type="button" key={name} onClick={() => onChoose(name)}>{name}</button>
          ))}
        </div>
      </section>
    </div>
  )
}

function DayDetail({ day, activities, onClose }: { day: Date; activities: Activity[]; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="day-dialog" role="dialog" aria-modal="true" aria-labelledby="day-title">
        <div className="dialog-header">
          <h2 id="day-title">{day.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="day-dialog-list">
          {activities.map((activity) => (
            <article key={activity.id} className="activity-detail" style={{ borderLeftColor: ACTIVITY_TYPE_COLORS[activity.type] }}>
              <div className="activity-detail-heading">
                <span className="type-badge" style={{ background: ACTIVITY_TYPE_COLORS[activity.type] }}>{ACTIVITY_TYPE_LABELS[activity.type]}</span>
                {activity.time && <span className="activity-time">{activity.time}</span>}
              </div>
              <h3>{activity.title}</h3>
              {activity.description && <p>{activity.description}</p>}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

type AdminDialogProps = {
  publicTurmaId: string | null
  onClose: () => void
}

function AdminDialog({ publicTurmaId, onClose }: AdminDialogProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [busy, setBusy] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [managedTurma, setManagedTurma] = useState<string>(publicTurmaId ?? CLASS_NAMES[0])
  const [managedActivities, setManagedActivities] = useState<Activity[]>([])
  const [adminSearch, setAdminSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [hasTime, setHasTime] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    let requestId = 0
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const currentRequest = ++requestId
      setUser(currentUser)
      setProfile(null)
      setAuthChecked(!currentUser)
      if (!currentUser) return
      try {
        const profileDoc = await getDoc(doc(db, 'admins', currentUser.uid))
        const data = profileDoc.data() as AdminProfile | undefined
        if (currentRequest === requestId) {
          setProfile(data && (data.role === 'representante' || data.role === 'superadmin') ? data : null)
          if (data?.role === 'representante' && data.turmaId) setManagedTurma(data.turmaId)
        }
      } catch {
        if (currentRequest === requestId) setProfile(null)
      } finally {
        if (currentRequest === requestId) setAuthChecked(true)
      }
    })
    return () => {
      requestId += 1
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!profile || !managedTurma) return
    const activitiesQuery = query(collection(db, 'activities'), where('turmaId', '==', managedTurma))
    return onSnapshot(activitiesQuery, (snapshot) => {
      setManagedActivities(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Activity))
    })
  }, [profile, managedTurma])

  const isRepresentante = profile?.role === 'representante'
  const turmaMismatch = isRepresentante && !!profile?.turmaId && !(CLASS_NAMES as readonly string[]).includes(profile.turmaId)
  const filteredActivities = managedActivities
    .filter((activity) => matchesSearch(activity, adminSearch))
    .sort((a, b) => a.date.localeCompare(b.date) || compareActivities(a, b))

  async function logIn(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setAuthError('')
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      setPassword('')
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'auth/too-many-requests') {
        setAuthError('Muitas tentativas de entrada. Aguarde um pouco antes de tentar novamente.')
      } else if (error instanceof FirebaseError && error.code === 'auth/network-request-failed') {
        setAuthError('Não foi possível conectar ao Firebase. Confira sua internet e tente novamente.')
      } else {
        setAuthError('E-mail ou senha inválidos.')
      }
    } finally {
      setBusy(false)
    }
  }

  function startCreate() {
    setEditing(null)
    setForm({ ...emptyForm, date: dateKey(new Date()) })
    setHasTime(false)
    setSaveError('')
    setFormOpen(true)
  }

  function startEdit(activity: Activity) {
    setEditing(activity)
    setForm({ title: activity.title, description: activity.description, type: activity.type, date: activity.date, time: activity.time })
    setHasTime(Boolean(activity.time))
    setSaveError('')
    setFormOpen(true)
  }

  async function saveActivity(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setSaveError('')
    try {
      const payload: ActivityInput = { ...form, time: hasTime ? form.time : null, turmaId: managedTurma }
      if (editing) {
        await updateDoc(doc(db, 'activities', editing.id), { ...payload, updatedAt: serverTimestamp() })
        setNotice('Atividade atualizada.')
      } else {
        await addDoc(collection(db, 'activities'), { ...payload, createdBy: user?.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
        setNotice('Atividade adicionada.')
      }
      setFormOpen(false)
      window.setTimeout(() => setNotice(''), 2800)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar a atividade.')
    } finally {
      setBusy(false)
    }
  }

  async function removeActivity(activity: Activity) {
    if (!window.confirm(`Excluir "${activity.title}"?`)) return
    try {
      await deleteDoc(doc(db, 'activities', activity.id))
      setNotice('Atividade excluída.')
      window.setTimeout(() => setNotice(''), 2800)
    } catch {
      setNotice('Não foi possível excluir a atividade.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-title">
        <div className="dialog-header">
          <div><p className="eyebrow dark">ACESSO RESTRITO</p><h2 id="admin-title">Área administrativa</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>

        {!authChecked ? (
          <div className="state-card"><LoaderCircle className="spin" /><p>Verificando acesso…</p></div>
        ) : !user ? (
          <form className="login-form" onSubmit={logIn}>
            <div className="login-symbol"><KeyRound /></div>
            <h3>Entre para gerenciar a agenda</h3>
            <p>Use o e-mail e a senha da sua conta no Firebase Authentication.</p>
            <label htmlFor="admin-email">E-mail</label>
            <input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" autoFocus required />
            <label htmlFor="admin-password">Senha</label>
            <input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            {authError && <p className="form-error">{authError}</p>}
            <button className="primary-button" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <>Entrar <ArrowRight /></>}</button>
          </form>
        ) : !profile ? (
          <div className="unauthorized">
            <DoorOpen /><h3>Esta conta não tem permissão</h3><p>Confira se há um documento com o UID desta conta em <code>admins</code>, com <code>role</code> igual a <code>representante</code> ou <code>superadmin</code>.</p>
            <button className="secondary-button" onClick={() => signOut(auth)}>Sair</button>
          </div>
        ) : turmaMismatch ? (
          <div className="unauthorized">
            <DoorOpen /><h3>Turma não reconhecida</h3><p>O campo <code>turmaId</code> deste representante ("{profile?.turmaId}") não corresponde a nenhuma turma em <code>src/classNames.ts</code>. Corrija a grafia no documento <code>admins/{user.uid}</code> no Firestore — o texto precisa ser idêntico.</p>
            <button className="secondary-button" onClick={() => signOut(auth)}>Sair</button>
          </div>
        ) : (
          <div className="admin-content">
            <div className="admin-toolbar">
              <div><span>Conectado como</span><strong>{user.email}</strong></div>
              <div className="toolbar-actions">
                <button className="secondary-button" onClick={() => signOut(auth)}><LogOut size={17} /> Sair</button>
                <button className="primary-button compact" onClick={startCreate}><Plus size={18} /> Nova atividade</button>
              </div>
            </div>
            {notice && <div className="notice"><Check size={17} /> {notice}</div>}

            <div className="managed-turma">
              <span>Gerenciando a turma</span>
              {isRepresentante ? (
                <strong>{managedTurma}</strong>
              ) : (
                <select value={managedTurma} onChange={(event) => setManagedTurma(event.target.value)}>
                  {CLASS_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              )}
            </div>

            <div className="admin-list-heading"><strong>Atividades cadastradas</strong><input aria-label="Buscar atividades" placeholder="Buscar por título ou descrição" value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} /></div>
            <div className="admin-list">
              {filteredActivities.length === 0 ? <p className="admin-empty">Nenhuma atividade encontrada.</p> : filteredActivities.map((activity) => (
                <article key={activity.id} className="admin-row">
                  <div className="avatar" style={{ color: ACTIVITY_TYPE_COLORS[activity.type] }}><UserRound /></div>
                  <div className="admin-row-main"><strong>{activity.title}</strong><span>{ACTIVITY_TYPE_LABELS[activity.type]}</span></div>
                  <div className="admin-row-meta"><span>{parseDateLabel(activity.date)}</span><strong>{activity.time ?? '—'}</strong></div>
                  <div className="row-actions">
                    <button onClick={() => startEdit(activity)} aria-label={`Editar ${activity.title}`}><Edit3 /></button>
                    <button className="danger" onClick={() => removeActivity(activity)} aria-label={`Excluir ${activity.title}`}><Trash2 /></button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {formOpen && (
          <div className="form-overlay">
            <form className="activity-form" onSubmit={saveActivity}>
              <div className="form-title"><div><p className="eyebrow dark">ATIVIDADE</p><h3>{editing ? 'Editar atividade' : 'Adicionar atividade'}</h3></div><button type="button" className="icon-button" onClick={() => setFormOpen(false)}><X /></button></div>
              <div className="form-grid">
                <label className="wide">Título<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
                <label>Tipo<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ActivityType })}>{ACTIVITY_TYPES.map((type) => <option value={type} key={type}>{ACTIVITY_TYPE_LABELS[type]}</option>)}</select></label>
                <label>Data<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
                <label className="toggle wide"><input type="checkbox" checked={hasTime} onChange={(event) => { setHasTime(event.target.checked); if (!event.target.checked) setForm({ ...form, time: null }) }} /><span /> Tem horário definido</label>
                {hasTime && <label>Horário<input required type="time" value={form.time ?? ''} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label>}
                <label className="wide">Descrição<textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Detalhes, capítulos, critérios de entrega…" /></label>
              </div>
              {saveError && <p className="form-error">{saveError}</p>}
              <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setFormOpen(false)}>Cancelar</button><button className="primary-button compact" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : 'Salvar atividade'}</button></div>
            </form>
          </div>
        )}
      </section>
    </div>
  )
}

function parseDateLabel(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default App
