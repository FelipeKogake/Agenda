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
  Lightbulb,
  ListChecks,
  LoaderCircle,
  LogOut,
  Menu,
  MessageSquarePlus,
  Plus,
  Settings,
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
  SUGGESTION_STATUS_LABELS,
  type Activity,
  type ActivityInput,
  type ActivityType,
  type AdminProfile,
  type Feedback,
  type Suggestion,
  type SuggestionInput,
} from './types'
import { addMySuggestionId, readMySuggestionIds, removeMySuggestionId } from './mySuggestions'
import {
  NEON_COLORS,
  NEON_COLOR_LABELS,
  NEON_COLOR_SWATCHES,
  THEME_LABELS,
  THEME_PREVIEW,
  THEMES,
  readStoredNeon,
  readStoredTheme,
  storeNeon,
  storeTheme,
  type NeonColor,
  type Theme,
} from './theme'
import {
  FONT_SCALES,
  FONT_SCALE_LABELS,
  readStoredFontScale,
  readStoredHighContrast,
  readStoredReduceMotion,
  storeFontScale,
  storeHighContrast,
  storeReduceMotion,
  type FontScale,
} from './accessibility'

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
  const [menuOpen, setMenuOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [mySuggestionsOpen, setMySuggestionsOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const [neon, setNeonState] = useState<NeonColor>(readStoredNeon)
  const [fontScale, setFontScaleState] = useState<FontScale>(readStoredFontScale)
  const [highContrast, setHighContrastState] = useState(readStoredHighContrast)
  const [reduceMotion, setReduceMotionState] = useState(readStoredReduceMotion)

  function setTheme(value: Theme) {
    setThemeState(value)
    storeTheme(value)
  }

  function setNeon(value: NeonColor) {
    setNeonState(value)
    storeNeon(value)
  }

  function setFontScale(value: FontScale) {
    setFontScaleState(value)
    storeFontScale(value)
  }

  function setHighContrast(value: boolean) {
    setHighContrastState(value)
    storeHighContrast(value)
  }

  function setReduceMotion(value: boolean) {
    setReduceMotionState(value)
    storeReduceMotion(value)
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.neon = neon
  }, [theme, neon])

  useEffect(() => {
    document.documentElement.dataset.fontScale = fontScale
  }, [fontScale])

  useEffect(() => {
    if (highContrast) document.documentElement.dataset.contrast = 'alto'
    else delete document.documentElement.dataset.contrast
  }, [highContrast])

  useEffect(() => {
    if (reduceMotion) document.documentElement.dataset.motion = 'reduzido'
    else delete document.documentElement.dataset.motion
  }, [reduceMotion])

  useEffect(() => {
    document.title = turmaId ? `Agenda — ${turmaId}` : 'Agenda da turma'
  }, [turmaId])

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
        <button
          type="button"
          className="menu-trigger"
          aria-label="Abrir menu"
          aria-haspopup="dialog"
          title="Menu"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={20} strokeWidth={2.3} aria-hidden="true" />
        </button>
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
            {turmaId && (
              <button type="button" className="secondary-button" onClick={() => setSuggestOpen(true)}>
                <Lightbulb size={16} /> Sugerir atividade
              </button>
            )}
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

      {menuOpen && (
        <SideMenu
          onClose={() => setMenuOpen(false)}
          onOpenConfig={() => { setConfigOpen(true); setMenuOpen(false) }}
          onOpenAdmin={() => { openAdmin(); setMenuOpen(false) }}
          onOpenMySuggestions={() => { setMySuggestionsOpen(true); setMenuOpen(false) }}
          onOpenFeedback={() => { setFeedbackOpen(true); setMenuOpen(false) }}
        />
      )}

      {suggestOpen && turmaId && <SuggestDialog turmaId={turmaId} onClose={() => setSuggestOpen(false)} />}

      {mySuggestionsOpen && <MySuggestionsDialog onClose={() => setMySuggestionsOpen(false)} />}

      {feedbackOpen && <FeedbackDialog turmaId={turmaId} onClose={() => setFeedbackOpen(false)} />}

      {configOpen && (
        <ConfigDialog
          theme={theme}
          neon={neon}
          onSetTheme={setTheme}
          onSetNeon={setNeon}
          fontScale={fontScale}
          onSetFontScale={setFontScale}
          highContrast={highContrast}
          onSetHighContrast={setHighContrast}
          reduceMotion={reduceMotion}
          onSetReduceMotion={setReduceMotion}
          onClose={() => setConfigOpen(false)}
        />
      )}

      {adminOpen && <AdminDialog publicTurmaId={turmaId} onClose={closeAdmin} />}

      <VLibrasWidget />
    </div>
  )
}

function VLibrasWidget() {
  useEffect(() => {
    if (document.getElementById('vlibras-script')) return
    const script = document.createElement('script')
    script.id = 'vlibras-script'
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js'
    script.onload = () => {
      const vlibras = (window as unknown as { VLibras?: { Widget: new (url: string) => unknown } }).VLibras
      if (vlibras) new vlibras.Widget('https://vlibras.gov.br/app')
    }
    document.body.appendChild(script)
  }, [])

  // Marcação exigida pelo widget oficial do governo (atributos não-padrão, por isso o `as Record<string, string>`).
  return (
    <div {...({ vw: '', className: 'enabled' } as Record<string, string>)}>
      <div {...({ 'vw-access-button': '', className: 'active' } as Record<string, string>)} />
      <div {...({ 'vw-plugin-wrapper': '' } as Record<string, string>)}>
        <div className="vw-plugin-top-wrapper" />
      </div>
    </div>
  )
}

function SideMenu({ onClose, onOpenConfig, onOpenAdmin, onOpenMySuggestions, onOpenFeedback }: {
  onClose: () => void
  onOpenConfig: () => void
  onOpenAdmin: () => void
  onOpenMySuggestions: () => void
  onOpenFeedback: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="side-menu" role="dialog" aria-modal="true" aria-labelledby="menu-title">
        <div className="dialog-header">
          <h2 id="menu-title">Menu</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <nav className="side-menu-list">
          <button type="button" onClick={onOpenConfig}><Settings size={18} /> Configurações</button>
          <button type="button" onClick={onOpenAdmin}><KeyRound size={18} /> Sou representante</button>
          <button type="button" onClick={onOpenFeedback}><MessageSquarePlus size={18} /> Comentar melhoria</button>
          <button type="button" onClick={onOpenMySuggestions}><ListChecks size={18} /> Minhas sugestões</button>
        </nav>
      </aside>
    </div>
  )
}

function ConfigDialog({
  theme,
  neon,
  onSetTheme,
  onSetNeon,
  fontScale,
  onSetFontScale,
  highContrast,
  onSetHighContrast,
  reduceMotion,
  onSetReduceMotion,
  onClose,
}: {
  theme: Theme
  neon: NeonColor
  onSetTheme: (value: Theme) => void
  onSetNeon: (value: NeonColor) => void
  fontScale: FontScale
  onSetFontScale: (value: FontScale) => void
  highContrast: boolean
  onSetHighContrast: (value: boolean) => void
  reduceMotion: boolean
  onSetReduceMotion: (value: boolean) => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="config-dialog" role="dialog" aria-modal="true" aria-labelledby="config-title">
        <div className="dialog-header">
          <h2 id="config-title">Configurações</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="config-content">
          <div className="config-section">
            <h3>Tema</h3>
            <div className="theme-options">
              {THEMES.map((value) => (
                <button
                  type="button"
                  key={value}
                  className={`theme-swatch ${theme === value ? 'active' : ''}`}
                  onClick={() => onSetTheme(value)}
                >
                  <span className="theme-dot" style={{ background: THEME_PREVIEW[value] }} />
                  {THEME_LABELS[value]}
                </button>
              ))}
            </div>
            {theme === 'cyberpunk' && (
              <div className="neon-options" aria-label="Cor de destaque neon">
                {NEON_COLORS.map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={`neon-swatch ${neon === value ? 'active' : ''}`}
                    style={{ background: NEON_COLOR_SWATCHES[value] }}
                    onClick={() => onSetNeon(value)}
                    aria-label={NEON_COLOR_LABELS[value]}
                    title={NEON_COLOR_LABELS[value]}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="config-section">
            <h3>Acessibilidade</h3>
            <p className="config-hint">Tamanho da fonte</p>
            <div className="theme-options">
              {FONT_SCALES.map((value) => (
                <button
                  type="button"
                  key={value}
                  className={`theme-swatch ${fontScale === value ? 'active' : ''}`}
                  onClick={() => onSetFontScale(value)}
                >
                  {FONT_SCALE_LABELS[value]}
                </button>
              ))}
            </div>
            <label className="a11y-toggle">
              <span>Alto contraste</span>
              <span className="toggle"><input type="checkbox" checked={highContrast} onChange={(event) => onSetHighContrast(event.target.checked)} /><span /></span>
            </label>
            <label className="a11y-toggle">
              <span>Reduzir animações</span>
              <span className="toggle"><input type="checkbox" checked={reduceMotion} onChange={(event) => onSetReduceMotion(event.target.checked)} /><span /></span>
            </label>
            <p className="config-hint">VLibras (tradutor de Libras) já está disponível no botão flutuante no canto da tela.</p>
          </div>
          <div className="config-section muted">
            <h3>Apoie o projeto</h3>
            <p>Em breve: chave Pix para quem quiser pagar um café.</p>
          </div>
        </div>
      </section>
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

function SuggestDialog({ turmaId, onClose }: { turmaId: string; onClose: () => void }) {
  const [form, setForm] = useState(emptyForm)
  const [hasTime, setHasTime] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const payload: SuggestionInput = { ...form, time: hasTime ? form.time : null, turmaId }
      const reference = await addDoc(collection(db, 'suggestions'), { ...payload, status: 'pendente', createdAt: serverTimestamp() })
      addMySuggestionId(reference.id)
      setSent(true)
    } catch {
      setError('Não foi possível enviar a sugestão. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="day-dialog" role="dialog" aria-modal="true" aria-labelledby="suggest-title">
        <div className="dialog-header">
          <div><p className="eyebrow dark">TURMA {turmaId}</p><h2 id="suggest-title">Sugerir atividade</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        {sent ? (
          <div className="state-card"><Check /><p>Sugestão enviada! O representante da turma vai avaliar. Acompanhe em "Minhas sugestões" no menu.</p></div>
        ) : (
          <form className="activity-form standalone" onSubmit={submit}>
            <div className="form-grid">
              <label className="wide">Título<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
              <label>Tipo<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ActivityType })}>{ACTIVITY_TYPES.map((type) => <option value={type} key={type}>{ACTIVITY_TYPE_LABELS[type]}</option>)}</select></label>
              <label>Data<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
              <label className="toggle wide"><input type="checkbox" checked={hasTime} onChange={(event) => { setHasTime(event.target.checked); if (!event.target.checked) setForm({ ...form, time: null }) }} /><span /> Tem horário definido</label>
              {hasTime && <label>Horário<input required type="time" value={form.time ?? ''} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label>}
              <label className="wide">Descrição<textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Detalhes, capítulos, critérios de entrega…" /></label>
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button compact" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : 'Enviar sugestão'}</button></div>
          </form>
        )}
      </section>
    </div>
  )
}

function MySuggestionsDialog({ onClose }: { onClose: () => void }) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    const ids = readMySuggestionIds()
    if (ids.length === 0) {
      setSuggestions([])
      return
    }
    Promise.all(ids.map((id) => getDoc(doc(db, 'suggestions', id)))).then((snapshots) => {
      if (cancelled) return
      const found: Suggestion[] = []
      snapshots.forEach((snapshot, index) => {
        if (snapshot.exists()) found.push({ id: snapshot.id, ...snapshot.data() } as Suggestion)
        else removeMySuggestionId(ids[index])
      })
      setSuggestions(found)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="day-dialog" role="dialog" aria-modal="true" aria-labelledby="my-suggestions-title">
        <div className="dialog-header">
          <h2 id="my-suggestions-title">Minhas sugestões</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="day-dialog-list">
          {suggestions === null ? (
            <div className="state-card"><LoaderCircle className="spin" /><p>Carregando…</p></div>
          ) : suggestions.length === 0 ? (
            <p className="admin-empty">Você ainda não enviou nenhuma sugestão neste navegador.</p>
          ) : suggestions.map((item) => (
            <article key={item.id} className="activity-detail" style={{ borderLeftColor: ACTIVITY_TYPE_COLORS[item.type] }}>
              <div className="activity-detail-heading">
                <span className="type-badge" style={{ background: ACTIVITY_TYPE_COLORS[item.type] }}>{ACTIVITY_TYPE_LABELS[item.type]}</span>
                <span className={`status-badge status-${item.status}`}>{SUGGESTION_STATUS_LABELS[item.status]}</span>
              </div>
              <h3>{item.title}</h3>
              {item.description && <p>{item.description}</p>}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function FeedbackDialog({ turmaId, onClose }: { turmaId: string | null; onClose: () => void }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await addDoc(collection(db, 'feedback'), { message: message.trim(), turmaId: turmaId ?? null, createdAt: serverTimestamp() })
      setSent(true)
    } catch {
      setError('Não foi possível enviar o comentário. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="day-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
        <div className="dialog-header">
          <h2 id="feedback-title">Comentar melhoria</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        {sent ? (
          <div className="state-card"><Check /><p>Obrigado! Seu comentário foi enviado.</p></div>
        ) : (
          <form className="activity-form standalone" onSubmit={submit}>
            <div className="form-grid">
              <label className="wide">
                O que podemos melhorar no site?
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Sugestões, problemas que encontrou, ideias..."
                  autoFocus
                />
              </label>
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button compact" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : 'Enviar comentário'}</button></div>
          </form>
        )}
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
  const [managedSuggestions, setManagedSuggestions] = useState<Suggestion[]>([])
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
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

  useEffect(() => {
    if (!profile || !managedTurma) return
    const suggestionsQuery = query(collection(db, 'suggestions'), where('turmaId', '==', managedTurma))
    return onSnapshot(suggestionsQuery, (snapshot) => {
      setManagedSuggestions(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Suggestion))
    })
  }, [profile, managedTurma])

  const isSuperAdmin = profile?.role === 'superadmin'

  useEffect(() => {
    if (!isSuperAdmin) return
    return onSnapshot(collection(db, 'feedback'), (snapshot) => {
      setFeedbackList(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Feedback))
    })
  }, [isSuperAdmin])

  const isRepresentante = profile?.role === 'representante'
  const turmaMismatch = isRepresentante && !!profile?.turmaId && !(CLASS_NAMES as readonly string[]).includes(profile.turmaId)
  const filteredActivities = managedActivities
    .filter((activity) => matchesSearch(activity, adminSearch))
    .sort((a, b) => a.date.localeCompare(b.date) || compareActivities(a, b))
  const pendingSuggestions = managedSuggestions
    .filter((item) => item.status === 'pendente')
    .sort((a, b) => a.date.localeCompare(b.date))
  const processedSuggestions = managedSuggestions
    .filter((item) => item.status !== 'pendente')
    .sort((a, b) => a.date.localeCompare(b.date))

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

  async function approveSuggestion(suggestion: Suggestion) {
    try {
      await addDoc(collection(db, 'activities'), {
        title: suggestion.title,
        description: suggestion.description,
        type: suggestion.type,
        date: suggestion.date,
        time: suggestion.time,
        turmaId: suggestion.turmaId,
        createdBy: user?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      await updateDoc(doc(db, 'suggestions', suggestion.id), { status: 'aprovada', updatedAt: serverTimestamp() })
      setNotice('Sugestão aprovada e adicionada à agenda.')
      window.setTimeout(() => setNotice(''), 2800)
    } catch {
      setNotice('Não foi possível aprovar a sugestão.')
    }
  }

  async function rejectSuggestion(suggestion: Suggestion) {
    try {
      await updateDoc(doc(db, 'suggestions', suggestion.id), { status: 'rejeitada', updatedAt: serverTimestamp() })
    } catch {
      setNotice('Não foi possível rejeitar a sugestão.')
    }
  }

  async function discardSuggestion(suggestion: Suggestion) {
    if (!window.confirm(`Remover a sugestão "${suggestion.title}" da lista?`)) return
    try {
      await deleteDoc(doc(db, 'suggestions', suggestion.id))
    } catch {
      setNotice('Não foi possível remover a sugestão.')
    }
  }

  async function discardFeedback(item: Feedback) {
    if (!window.confirm('Remover este comentário da lista?')) return
    try {
      await deleteDoc(doc(db, 'feedback', item.id))
    } catch {
      setNotice('Não foi possível remover o comentário.')
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

            {isSuperAdmin && (
              <>
                <div className="admin-list-heading">
                  <strong>Feedback do site</strong>
                  {feedbackList.length > 0 && <span className="soon-badge pending">{feedbackList.length}</span>}
                </div>
                <div className="admin-list">
                  {feedbackList.length === 0 ? <p className="admin-empty">Nenhum comentário recebido.</p> : feedbackList.map((item) => (
                    <article key={item.id} className="admin-row">
                      <div className="avatar"><MessageSquarePlus /></div>
                      <div className="admin-row-main"><span className="feedback-message">{item.message}</span></div>
                      <div className="admin-row-meta"><span>{item.turmaId ?? 'Geral'}</span><strong>{item.createdAt ? item.createdAt.toDate().toLocaleDateString('pt-BR') : '—'}</strong></div>
                      <div className="row-actions">
                        <button className="danger" onClick={() => discardFeedback(item)} aria-label="Remover comentário"><Trash2 /></button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}

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

            <div className="admin-list-heading">
              <strong>Sugestões dos alunos</strong>
              {pendingSuggestions.length > 0 && <span className="soon-badge pending">{pendingSuggestions.length} pendente{pendingSuggestions.length === 1 ? '' : 's'}</span>}
            </div>
            <div className="admin-list">
              {pendingSuggestions.length === 0 ? <p className="admin-empty">Nenhuma sugestão pendente.</p> : pendingSuggestions.map((suggestion) => (
                <article key={suggestion.id} className="admin-row">
                  <div className="avatar" style={{ color: ACTIVITY_TYPE_COLORS[suggestion.type] }}><Lightbulb /></div>
                  <div className="admin-row-main"><strong>{suggestion.title}</strong><span>{ACTIVITY_TYPE_LABELS[suggestion.type]} · {parseDateLabel(suggestion.date)}{suggestion.time ? ` · ${suggestion.time}` : ''}</span></div>
                  <div className="admin-row-meta"><span>{suggestion.description}</span></div>
                  <div className="row-actions">
                    <button onClick={() => approveSuggestion(suggestion)} aria-label={`Aprovar ${suggestion.title}`}><Check /></button>
                    <button className="danger" onClick={() => rejectSuggestion(suggestion)} aria-label={`Rejeitar ${suggestion.title}`}><X /></button>
                  </div>
                </article>
              ))}
            </div>
            {processedSuggestions.length > 0 && (
              <>
                <div className="admin-list-heading"><strong>Sugestões avaliadas</strong></div>
                <div className="admin-list">
                  {processedSuggestions.map((suggestion) => (
                    <article key={suggestion.id} className="admin-row">
                      <div className="avatar"><Lightbulb /></div>
                      <div className="admin-row-main"><strong>{suggestion.title}</strong><span className={`status-badge status-${suggestion.status}`}>{SUGGESTION_STATUS_LABELS[suggestion.status]}</span></div>
                      <div className="admin-row-meta"><span>{parseDateLabel(suggestion.date)}</span></div>
                      <div className="row-actions">
                        <button className="danger" onClick={() => discardSuggestion(suggestion)} aria-label={`Remover ${suggestion.title}`}><Trash2 /></button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}

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
