import { FormEvent, useEffect, useMemo, useState } from 'react';
import { couleursParType, evenementsApi, typeEvenementLabels } from '../lib/api';
import { PageHeader } from '../components/UI';
import type { EvenementInput, EvenementProduction, TypeEvenement } from '../types';

const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const TYPES: TypeEvenement[] = ['CONGE', 'RDV', 'PRODUCTION', 'LIVRAISON', 'AUTRE'];

type FormState = EvenementInput & { id?: string };

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toDatetimeLocal(date: Date) {
  return `${toDateInput(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function eventOnDay(event: EvenementProduction, day: Date) {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const start = new Date(event.dateDebut);
  const end = new Date(event.dateFin);
  return start <= dayEnd && end >= dayStart;
}

function getCalendarDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  let startOffset = first.getDay() - 1;
  if (startOffset < 0) startOffset = 6;
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(year, month, 1 - startOffset + i));
  }
  return days;
}

function monthRange(year: number, month: number) {
  return {
    from: new Date(year, month, 1).toISOString(),
    to: new Date(year, month + 1, 0, 23, 59, 59).toISOString(),
  };
}

function emptyForm(date = new Date()): FormState {
  return {
    titre: '',
    description: '',
    type: 'PRODUCTION',
    couleur: couleursParType.PRODUCTION,
    dateDebut: toDatetimeLocal(startOfDay(date)),
    dateFin: toDatetimeLocal(endOfDay(date)),
    jourEntier: true,
  };
}

function formFromEvent(event: EvenementProduction): FormState {
  const debut = new Date(event.dateDebut);
  const fin = new Date(event.dateFin);
  return {
    id: event.id,
    titre: event.titre,
    description: event.description ?? '',
    type: event.type,
    couleur: event.couleur,
    dateDebut: event.jourEntier ? toDateInput(debut) : toDatetimeLocal(debut),
    dateFin: event.jourEntier ? toDateInput(fin) : toDatetimeLocal(fin),
    jourEntier: event.jourEntier,
  };
}

function parseFormDates(form: FormState) {
  if (form.jourEntier) {
    const debut = startOfDay(new Date(form.dateDebut));
    const fin = endOfDay(new Date(form.dateFin));
    return { dateDebut: debut.toISOString(), dateFin: fin.toISOString() };
  }
  return {
    dateDebut: new Date(form.dateDebut).toISOString(),
    dateFin: new Date(form.dateFin).toISOString(),
  };
}

function formatEventTime(event: EvenementProduction) {
  const debut = new Date(event.dateDebut);
  const fin = new Date(event.dateFin);
  if (event.jourEntier) {
    if (isSameDay(debut, fin)) return 'Journée entière';
    return `${debut.toLocaleDateString('fr-BE')} → ${fin.toLocaleDateString('fr-BE')}`;
  }
  return `${debut.toLocaleString('fr-BE', { dateStyle: 'short', timeStyle: 'short' })} → ${fin.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}`;
}

export function CalendrierPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [evenements, setEvenements] = useState<EvenementProduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  async function loadEvents() {
    setLoading(true);
    setError('');
    try {
      const { from, to } = monthRange(viewYear, viewMonth);
      const data = await evenementsApi.list(from, to);
      setEvenements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, [viewYear, viewMonth]);

  const calendarDays = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EvenementProduction[]>();
    for (const day of calendarDays) {
      const key = toDateInput(day);
      map.set(
        key,
        evenements.filter((e) => eventOnDay(e, day)).sort((a, b) =>
          new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime(),
        ),
      );
    }
    return map;
  }, [calendarDays, evenements]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return [...evenements]
      .filter((e) => new Date(e.dateFin) >= now)
      .sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime())
      .slice(0, 8);
  }, [evenements]);

  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  function changeMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function openCreate(date?: Date) {
    setForm(emptyForm(date ?? new Date()));
    setSelectedDay(date ?? null);
    setFormOpen(true);
    setError('');
  }

  function openEdit(event: EvenementProduction) {
    setForm(formFromEvent(event));
    setSelectedDay(new Date(event.dateDebut));
    setFormOpen(true);
    setError('');
  }

  function handleTypeChange(type: TypeEvenement) {
    setForm((prev) => ({
      ...prev,
      type,
      couleur: couleursParType[type],
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.titre.trim()) {
      setError('Le titre est requis');
      return;
    }

    const dates = parseFormDates(form);
    const payload: EvenementInput = {
      titre: form.titre.trim(),
      description: form.description?.trim() || undefined,
      type: form.type,
      couleur: form.couleur,
      ...dates,
      jourEntier: form.jourEntier,
    };

    setSaving(true);
    setError('');
    try {
      if (form.id) {
        await evenementsApi.update(form.id, payload);
      } else {
        await evenementsApi.create(payload);
      }
      setFormOpen(false);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!form.id || !window.confirm('Supprimer cet événement ?')) return;
    setSaving(true);
    setError('');
    try {
      await evenementsApi.remove(form.id);
      setFormOpen(false);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Calendrier production"
        subtitle="Planifiez congés, rendez-vous, productions et livraisons"
        action={
          <button type="button" className="btn btn-primary" onClick={() => openCreate()}>
            + Nouvel événement
          </button>
        }
      />

      {error && !formOpen && <p className="error-text">{error}</p>}

      <div className="calendrier-layout">
        <section className="panel calendrier-panel">
          <div className="calendrier-toolbar">
            <div className="calendrier-nav">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => changeMonth(-1)}>
                ←
              </button>
              <h2>
                {MOIS_NOMS[viewMonth]} {viewYear}
              </h2>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => changeMonth(1)}>
                →
              </button>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={goToToday}>
              Aujourd&apos;hui
            </button>
          </div>

          <div className="calendrier-legend">
            {TYPES.map((type) => (
              <span key={type} className="calendrier-legend-item">
                <span className="calendrier-legend-dot" style={{ background: couleursParType[type] }} />
                {typeEvenementLabels[type]}
              </span>
            ))}
          </div>

          {loading ? (
            <p className="muted">Chargement du calendrier…</p>
          ) : (
            <div className="calendrier-grid">
              {JOURS_SEMAINE.map((jour) => (
                <div key={jour} className="calendrier-weekday">
                  {jour}
                </div>
              ))}
              {calendarDays.map((day) => {
                const key = toDateInput(day);
                const dayEvents = eventsByDay.get(key) ?? [];
                const inMonth = day.getMonth() === viewMonth;
                const isToday = isSameDay(day, today);

                return (
                  <button
                    key={key}
                    type="button"
                    className={`calendrier-day ${inMonth ? '' : 'calendrier-day-out'} ${isToday ? 'calendrier-day-today' : ''}`}
                    onClick={() => openCreate(day)}
                  >
                    <span className="calendrier-day-num">{day.getDate()}</span>
                    <div className="calendrier-day-events">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <span
                          key={ev.id}
                          className="calendrier-event-chip"
                          style={{ background: ev.couleur }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(ev);
                          }}
                          title={ev.titre}
                        >
                          {ev.titre}
                        </span>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="calendrier-event-more">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="panel calendrier-sidebar">
          <h2>À venir</h2>
          {upcomingEvents.length === 0 ? (
            <p className="muted">Aucun événement prévu ce mois-ci.</p>
          ) : (
            <ul className="calendrier-upcoming">
              {upcomingEvents.map((ev) => (
                <li key={ev.id}>
                  <button type="button" className="calendrier-upcoming-item" onClick={() => openEdit(ev)}>
                    <span className="calendrier-upcoming-dot" style={{ background: ev.couleur }} />
                    <span>
                      <strong>{ev.titre}</strong>
                      <small>{typeEvenementLabels[ev.type]} · {formatEventTime(ev)}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div
            className="modal-panel"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{form.id ? 'Modifier l\'événement' : 'Nouvel événement'}</h2>
              <button type="button" className="modal-close" onClick={() => setFormOpen(false)} aria-label="Fermer">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="add-form calendrier-form">
              {error && <p className="error-text">{error}</p>}

              <label>
                Titre
                <input
                  value={form.titre}
                  onChange={(e) => setForm((prev) => ({ ...prev, titre: e.target.value }))}
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </label>

              <div className="calendrier-form-row">
                <label>
                  Type
                  <select
                    value={form.type}
                    onChange={(e) => handleTypeChange(e.target.value as TypeEvenement)}
                  >
                    {TYPES.map((type) => (
                      <option key={type} value={type}>
                        {typeEvenementLabels[type]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Couleur
                  <input
                    type="color"
                    value={form.couleur}
                    onChange={(e) => setForm((prev) => ({ ...prev, couleur: e.target.value }))}
                  />
                </label>
              </div>

              <label className="calendrier-check">
                <input
                  type="checkbox"
                  checked={form.jourEntier}
                  onChange={(e) => {
                    const jourEntier = e.target.checked;
                    const baseDate = selectedDay ?? new Date(form.dateDebut);
                    setForm((prev) => ({
                      ...prev,
                      jourEntier,
                      dateDebut: jourEntier ? toDateInput(baseDate) : toDatetimeLocal(startOfDay(baseDate)),
                      dateFin: jourEntier ? toDateInput(baseDate) : toDatetimeLocal(endOfDay(baseDate)),
                    }));
                  }}
                />
                Journée entière
              </label>

              <div className="calendrier-form-row">
                <label>
                  Début
                  <input
                    type={form.jourEntier ? 'date' : 'datetime-local'}
                    value={form.dateDebut}
                    onChange={(e) => setForm((prev) => ({ ...prev, dateDebut: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Fin
                  <input
                    type={form.jourEntier ? 'date' : 'datetime-local'}
                    value={form.dateFin}
                    onChange={(e) => setForm((prev) => ({ ...prev, dateFin: e.target.value }))}
                    required
                  />
                </label>
              </div>

              <div className="calendrier-form-actions">
                {form.id && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    Supprimer
                  </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement…' : form.id ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
