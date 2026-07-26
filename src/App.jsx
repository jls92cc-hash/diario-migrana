import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = {
  bg: "#F1EEF7",
  surface: "#FFFFFF",
  surfaceRaised: "#F7F5FB",
  ink: "#332E45",
  muted: "#8C86A0",
  hairline: "#E2DEEC",
  violet: "#8C7BC4",
  coral: "#D97D6C",
  teal: "#5FA39A",
};

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

function intensityColor(v) {
  // 0 -> teal, 5 -> violet, 10 -> coral
  if (v <= 5) {
    const t = v / 5;
    return mix(COLORS.teal, COLORS.violet, t);
  }
  const t = (v - 5) / 5;
  return mix(COLORS.violet, COLORS.coral, t);
}

function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const EMPTY_ENTRY = {
  tuvoMigrana: null,
  intensidad: 0,
  duracionHoras: "",
  suenoHoras: "",
  hidratacionVasos: "",
  estres: 0,
  medicacion: null,
  medicacionNota: "",
  estadoAnimo: null,
  cicloMenstrual: null,
  notas: "",
  comentariosAdicionales: "",
};

const ANIMOS = [
  { valor: 1, emoji: "😞", etiqueta: "Muy mal" },
  { valor: 2, emoji: "😕", etiqueta: "Mal" },
  { valor: 3, emoji: "😐", etiqueta: "Regular" },
  { valor: 4, emoji: "🙂", etiqueta: "Bien" },
  { valor: 5, emoji: "😄", etiqueta: "Muy bien" },
];

const RANGOS_EDAD = ["Menos de 18", "18-24", "25-34", "35-44", "45-54", "55 o más"];
const OPCIONES_SEXO = ["Femenino", "Masculino", "Otro", "Prefiero no decir"];
const IDIOMAS = [
  { valor: "es", etiqueta: "Español" },
  { valor: "en", etiqueta: "English (próximamente)" },
  { valor: "pt", etiqueta: "Português (em breve)" },
];

const EMPTY_PROFILE = {
  rangoEdad: "",
  sexo: "",
  idioma: "es",
  seguimientoCiclo: null,
};

export default function DiarioMigrana() {
  const [date, setDate] = useState(todayISO());
  const [entry, setEntry] = useState(EMPTY_ENTRY);
  const [allEntries, setAllEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [profileDraft, setProfileDraft] = useState(EMPTY_PROFILE);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadAll();
    try {
      const stored = localStorage.getItem("profile");
      if (stored) setProfile(JSON.parse(stored));
    } catch (e) {}
  }, []);

  function saveProfile(p) {
    try {
      localStorage.setItem("profile", JSON.stringify(p));
      setProfile(p);
      setShowSettings(false);
    } catch (e) {
      setError("No se pudo guardar el perfil.");
    }
  }

  useEffect(() => {
    setEntry(allEntries[date] || EMPTY_ENTRY);
    setSaved(false);
  }, [date, allEntries]);

  function loadAll() {
    setLoading(true);
    try {
      const results = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("entry:")) {
          try {
            const day = k.replace("entry:", "");
            results[day] = JSON.parse(localStorage.getItem(k));
          } catch (e) {}
        }
      }
      setAllEntries(results);
    } catch (e) {
      setError("No se pudieron cargar los registros guardados.");
    } finally {
      setLoading(false);
    }
  }

  function saveEntry() {
    setError("");
    try {
      localStorage.setItem(`entry:${date}`, JSON.stringify(entry));
      setAllEntries((prev) => ({ ...prev, [date]: entry }));
      setSaved(true);
    } catch (e) {
      setError("No se pudo guardar el registro. Intenta de nuevo.");
    }
  }

  const update = (field) => (value) => {
    setEntry((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const history = useMemo(() => {
    return Object.entries(allEntries)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-14)
      .map(([day, e]) => ({
        day,
        label: formatDateLabel(day),
        intensidad: e.tuvoMigrana ? Number(e.intensidad) || 0 : 0,
        tuvoMigrana: e.tuvoMigrana,
      }));
  }, [allEntries]);

  if (!profile || showSettings) {
    return (
      <div style={styles.page}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
          * { box-sizing: border-box; }
        `}</style>
        <div style={{ ...styles.container, maxWidth: 420, paddingTop: 40 }}>
          <div style={styles.eyebrow}>{profile ? "AJUSTES DE PERFIL" : "ANTES DE EMPEZAR"}</div>
          <h1 style={styles.title}>{profile ? "Editar perfil" : "Bienvenida"}</h1>
          <p style={styles.subtitle}>
            Estos datos son opcionales y quedan guardados solo en tu dispositivo. Nunca se usan
            para dar consejos — solo para que el diario se ajuste un poco mejor a ti.
          </p>

          <div style={{ ...styles.card, marginTop: 20 }}>
            <Field label="Rango de edad">
              <SelectRow
                options={RANGOS_EDAD}
                value={profileDraft.rangoEdad}
                onSelect={(v) => setProfileDraft((p) => ({ ...p, rangoEdad: v }))}
              />
            </Field>

            <Field label="Sexo">
              <SelectRow
                options={OPCIONES_SEXO}
                value={profileDraft.sexo}
                onSelect={(v) => setProfileDraft((p) => ({ ...p, sexo: v }))}
              />
            </Field>

            <Field label="Idioma de la app">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {IDIOMAS.map((i) => (
                  <button
                    key={i.valor}
                    className="toggle-btn"
                    disabled={i.valor !== "es"}
                    onClick={() => setProfileDraft((p) => ({ ...p, idioma: i.valor }))}
                    style={{
                      textAlign: "left",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${profileDraft.idioma === i.valor ? COLORS.violet : COLORS.hairline}`,
                      background: profileDraft.idioma === i.valor ? COLORS.surfaceRaised : COLORS.surface,
                      color: i.valor !== "es" ? COLORS.muted : COLORS.ink,
                      fontSize: 14,
                      cursor: i.valor === "es" ? "pointer" : "not-allowed",
                    }}
                  >
                    {i.etiqueta}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="¿Quieres incluir el ciclo menstrual como variable diaria?">
              <p style={{ fontSize: 12.5, color: COLORS.muted, marginTop: -4, marginBottom: 10 }}>
                Es uno de los factores más documentados junto a la migraña. Solo agrega un campo
                de registro más — sin ningún análisis ni predicción.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <ToggleButton active={profileDraft.seguimientoCiclo === true} onClick={() => setProfileDraft((p) => ({ ...p, seguimientoCiclo: true }))} color={COLORS.violet}>
                  Sí, incluirlo
                </ToggleButton>
                <ToggleButton active={profileDraft.seguimientoCiclo === false} onClick={() => setProfileDraft((p) => ({ ...p, seguimientoCiclo: false }))} color={COLORS.hairline}>
                  No, gracias
                </ToggleButton>
              </div>
            </Field>

            <button style={styles.saveButton} onClick={() => saveProfile(profileDraft)}>
              {profile ? "Guardar cambios" : "Empezar a registrar"}
            </button>
            {profile && (
              <button
                style={{ ...styles.saveButton, marginTop: 10, background: "transparent", border: `1px solid ${COLORS.hairline}`, color: COLORS.muted }}
                onClick={() => setShowSettings(false)}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        input[type="range"] { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 4px; outline: none; }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 20px; height: 20px; border-radius: 50%;
          background: #FFFFFF; border: 3px solid ${COLORS.violet};
          box-shadow: 0 1px 4px rgba(140,123,196,0.35);
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px; height: 20px; border-radius: 50%;
          background: #FFFFFF; border: 3px solid ${COLORS.violet};
          cursor: pointer;
        }
        .toggle-btn { transition: all 0.15s ease; }
        textarea, input[type="number"] { font-family: inherit; }
        ::selection { background: ${COLORS.violet}; color: white; }
      `}</style>

      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerTop}>
            <div style={styles.eyebrow}>REGISTRO PERSONAL</div>
            <button
              style={styles.settingsBtn}
              onClick={() => {
                setProfileDraft(profile || EMPTY_PROFILE);
                setShowSettings(true);
              }}
              aria-label="Editar perfil"
              title="Editar perfil"
            >
              ⚙
            </button>
          </div>
          <h1 style={styles.title}>Diario de migraña</h1>
          <p style={styles.subtitle}>
            Solo un espacio para anotar lo que ocurrió. Sin interpretaciones, sin consejos —
            los patrones los lees tú, cuando quieras, con tu médico.
          </p>
        </header>

        <div style={styles.dateRow}>
          <button style={styles.dateArrow} onClick={() => shiftDate(date, -1, setDate)} aria-label="Día anterior">
            ‹
          </button>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            style={styles.dateInput}
          />
          <button
            style={styles.dateArrow}
            onClick={() => shiftDate(date, 1, setDate)}
            disabled={date >= todayISO()}
            aria-label="Día siguiente"
          >
            ›
          </button>
        </div>

        <main style={styles.card}>
          <Field label="¿Tuviste migraña este día?">
            <div style={{ display: "flex", gap: 10 }}>
              <ToggleButton active={entry.tuvoMigrana === true} onClick={() => update("tuvoMigrana")(true)} color={COLORS.coral}>
                Sí
              </ToggleButton>
              <ToggleButton active={entry.tuvoMigrana === false} onClick={() => update("tuvoMigrana")(false)} color={COLORS.teal}>
                No
              </ToggleButton>
            </div>
          </Field>

          {entry.tuvoMigrana && (
            <>
              <Field label={`Intensidad del dolor: ${entry.intensidad}/10`}>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={entry.intensidad}
                  onChange={(e) => update("intensidad")(Number(e.target.value))}
                  style={{
                    width: "100%",
                    background: `linear-gradient(to right, ${COLORS.teal}, ${COLORS.violet}, ${COLORS.coral})`,
                  }}
                />
                <div style={styles.sliderLabels}>
                  <span>Leve</span>
                  <span>Intenso</span>
                </div>
              </Field>

              <Field label="Duración (horas)">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={entry.duracionHoras}
                  onChange={(e) => update("duracionHoras")(e.target.value)}
                  style={styles.numberInput}
                  placeholder="0"
                />
              </Field>
            </>
          )}

          <Divider />

          {profile?.seguimientoCiclo && (
            <>
              <Field label="¿Estás en tu periodo menstrual hoy?">
                <div style={{ display: "flex", gap: 10 }}>
                  <ToggleButton active={entry.cicloMenstrual === true} onClick={() => update("cicloMenstrual")(true)} color={COLORS.violet}>
                    Sí
                  </ToggleButton>
                  <ToggleButton active={entry.cicloMenstrual === false} onClick={() => update("cicloMenstrual")(false)} color={COLORS.hairline}>
                    No
                  </ToggleButton>
                </div>
              </Field>
              <Divider />
            </>
          )}

          <Field label="Horas de sueño">
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={entry.suenoHoras}
              onChange={(e) => update("suenoHoras")(e.target.value)}
              style={styles.numberInput}
              placeholder="0"
            />
          </Field>

          <Field label="Vasos de agua">
            <input
              type="number"
              min={0}
              value={entry.hidratacionVasos}
              onChange={(e) => update("hidratacionVasos")(e.target.value)}
              style={styles.numberInput}
              placeholder="0"
            />
          </Field>

          <Field label={`Nivel de estrés percibido: ${entry.estres}/10`}>
            <input
              type="range"
              min={0}
              max={10}
              value={entry.estres}
              onChange={(e) => update("estres")(Number(e.target.value))}
              style={{ width: "100%", background: COLORS.hairline }}
            />
          </Field>

          <Divider />

          <Field label="¿Tomaste medicación?">
            <div style={{ display: "flex", gap: 10, marginBottom: entry.medicacion ? 10 : 0 }}>
              <ToggleButton active={entry.medicacion === true} onClick={() => update("medicacion")(true)} color={COLORS.violet}>
                Sí
              </ToggleButton>
              <ToggleButton active={entry.medicacion === false} onClick={() => update("medicacion")(false)} color={COLORS.hairline}>
                No
              </ToggleButton>
            </div>
            {entry.medicacion && (
              <input
                type="text"
                value={entry.medicacionNota}
                onChange={(e) => update("medicacionNota")(e.target.value)}
                placeholder="¿Cuál y a qué hora? (opcional)"
                style={styles.textInput}
              />
            )}
          </Field>

          <Divider />

          <Field label="En resumen, ¿cómo te sentiste hoy?">
            <div style={{ display: "flex", gap: 8 }}>
              {ANIMOS.map((a) => (
                <button
                  key={a.valor}
                  className="toggle-btn"
                  onClick={() => update("estadoAnimo")(a.valor)}
                  title={a.etiqueta}
                  aria-label={a.etiqueta}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 10,
                    border: `1px solid ${entry.estadoAnimo === a.valor ? COLORS.violet : COLORS.hairline}`,
                    background: entry.estadoAnimo === a.valor ? COLORS.surfaceRaised : COLORS.surface,
                    fontSize: 22,
                    cursor: "pointer",
                  }}
                >
                  {a.emoji}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Notas libres">
            <textarea
              value={entry.notas}
              onChange={(e) => update("notas")(e.target.value)}
              placeholder="Cualquier cosa que quieras recordar sobre este día..."
              style={styles.textarea}
              rows={3}
            />
          </Field>

          <Field label="Comentarios adicionales">
            <textarea
              value={entry.comentariosAdicionales}
              onChange={(e) => update("comentariosAdicionales")(e.target.value)}
              placeholder="Espacio libre para lo que no encaje en los campos anteriores..."
              style={styles.textarea}
              rows={2}
            />
          </Field>

          {error && <div style={styles.errorBox}>{error}</div>}

          <button style={styles.saveButton} onClick={saveEntry}>
            {saved ? "Guardado ✓" : "Guardar registro"}
          </button>
        </main>

        <section style={styles.historySection}>
          <div style={styles.eyebrow}>ÚLTIMOS 14 DÍAS</div>
          {loading ? (
            <p style={styles.mutedText}>Cargando...</p>
          ) : history.length === 0 ? (
            <p style={styles.mutedText}>Todavía no hay registros. Tu primer día aparecerá aquí.</p>
          ) : (
            <div style={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={COLORS.hairline} vertical={false} />
                  <XAxis dataKey="label" stroke={COLORS.muted} fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 10]} stroke={COLORS.muted} fontSize={11} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.hairline}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 12 }}
                    labelStyle={{ color: COLORS.ink }}
                    formatter={(v, n, p) => [p.payload.tuvoMigrana ? `${v}/10` : "sin migraña", "Intensidad"]}
                  />
                  <Line type="monotone" dataKey="intensidad" stroke={COLORS.violet} strokeWidth={2} dot={{ r: 3, fill: COLORS.violet }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <footer style={styles.footer}>
          Este registro es solo para tu propio seguimiento. No ofrece diagnósticos ni
          recomendaciones — comparte estos datos con un profesional de salud si lo consideras útil.
        </footer>
      </div>
    </div>
  );
}

function shiftDate(iso, delta, setDate) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + delta);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  setDate(d.toISOString().slice(0, 10));
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={styles.fieldLabel}>{label}</div>
      {children}
    </div>
  );
}

function SelectRow({ options, value, onSelect }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => (
        <button
          key={opt}
          className="toggle-btn"
          onClick={() => onSelect(opt)}
          style={{
            padding: "8px 14px",
            borderRadius: 20,
            border: `1px solid ${value === opt ? COLORS.violet : COLORS.hairline}`,
            background: value === opt ? COLORS.surfaceRaised : COLORS.surface,
            color: COLORS.ink,
            fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: COLORS.hairline, margin: "22px 0" }} />;
}

function ToggleButton({ active, onClick, children, color }) {
  return (
    <button
      className="toggle-btn"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 16px",
        borderRadius: 8,
        border: `1px solid ${active ? color : COLORS.hairline}`,
        background: active ? color : "transparent",
        color: active ? "#1B1D24" : COLORS.ink,
        fontFamily: "Inter, sans-serif",
        fontWeight: 500,
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: COLORS.bg,
    color: COLORS.ink,
    fontFamily: "Inter, sans-serif",
    padding: "32px 16px 60px",
  },
  container: { maxWidth: 560, margin: "0 auto" },
  header: { marginBottom: 28 },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  settingsBtn: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.hairline}`,
    borderRadius: 8,
    width: 32,
    height: 32,
    fontSize: 15,
    color: COLORS.muted,
    cursor: "pointer",
  },
  eyebrow: {
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 11,
    letterSpacing: "0.12em",
    color: COLORS.violet,
    marginBottom: 10,
  },
  title: {
    fontFamily: "Fraunces, serif",
    fontSize: 32,
    fontWeight: 600,
    margin: 0,
    marginBottom: 10,
    letterSpacing: "-0.01em",
  },
  subtitle: { color: COLORS.muted, fontSize: 14.5, lineHeight: 1.6, margin: 0, maxWidth: 460 },
  dateRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 },
  dateArrow: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.hairline}`,
    color: COLORS.ink,
    width: 36,
    height: 36,
    borderRadius: 8,
    fontSize: 18,
    cursor: "pointer",
  },
  dateInput: {
    flex: 1,
    background: COLORS.surface,
    border: `1px solid ${COLORS.hairline}`,
    color: COLORS.ink,
    borderRadius: 8,
    padding: "9px 12px",
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 14,
  },
  card: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.hairline}`,
    borderRadius: 14,
    padding: 24,
  },
  fieldLabel: { fontSize: 13.5, color: COLORS.muted, marginBottom: 10, fontWeight: 500 },
  sliderLabels: { display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.muted, marginTop: 6 },
  numberInput: {
    width: 120,
    background: COLORS.surfaceRaised,
    border: `1px solid ${COLORS.hairline}`,
    color: COLORS.ink,
    borderRadius: 8,
    padding: "9px 12px",
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 14,
  },
  textInput: {
    width: "100%",
    background: COLORS.surfaceRaised,
    border: `1px solid ${COLORS.hairline}`,
    color: COLORS.ink,
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
  },
  textarea: {
    width: "100%",
    background: COLORS.surfaceRaised,
    border: `1px solid ${COLORS.hairline}`,
    color: COLORS.ink,
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    resize: "vertical",
  },
  saveButton: {
    width: "100%",
    marginTop: 6,
    padding: "13px 0",
    borderRadius: 8,
    border: "none",
    background: COLORS.violet,
    color: "#1B1D24",
    fontWeight: 600,
    fontSize: 14.5,
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  },
  errorBox: {
    background: "rgba(217,125,108,0.12)",
    border: `1px solid ${COLORS.coral}`,
    color: COLORS.coral,
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 13,
    marginBottom: 14,
  },
  historySection: { marginTop: 32 },
  mutedText: { color: COLORS.muted, fontSize: 13.5 },
  chartWrap: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.hairline}`,
    borderRadius: 14,
    padding: "16px 8px 4px",
  },
  footer: {
    marginTop: 36,
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 1.6,
    textAlign: "center",
  },
};
