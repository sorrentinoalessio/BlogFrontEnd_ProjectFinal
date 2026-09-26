import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../Card/Card.jsx";
import styles from "./AddPost.module.css";
import { useDispatch, useSelector } from "react-redux";
import { clearUser, userSelectors } from "../../../reducers/user.slice.js";

import { createPost } from "../../services/addPost.service.js";
import { getWeatherForDate } from "../../services/weather.service.js";
import { toast } from "react-toastify";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

const statusOptions = [
    { value: "draft", label: "Non Pubblicato" },
    { value: "public", label: "Pubblicato" },
    { value: "archived", label: "Archiviato" },
    { value: "delete", label: "Eliminato" },
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const weekDays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const hourOptions = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const minuteOptions = ["00", "15", "30", "45"];

const toDateValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getCalendarDays = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: offset + daysInMonth }, (_, index) => (
        index < offset ? null : new Date(year, month, index - offset + 1)
    ));
};

const MapClickHandler = ({ onSelect }) => {
    useMapEvents({
        click: (event) => onSelect([event.latlng.lat, event.latlng.lng]),
    });

    return null;
};

const MapCenterController = ({ center }) => {
    const map = useMap();

    useEffect(() => {
        if (center) map.flyTo(center, 13, { duration: 0.8 });
    }, [center, map]);

    return null;
};

const AddPost = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector(userSelectors.selectUser);

    const [form, setForm] = useState({
        title: "",
        description: "",
        status: "draft",
        eventDate: "",
        eventTime: "",
        locality: "",
        tagText: "",
        imagePost: "",
        uploadedFile: null,
        coordinates: null,
    });

    const [errors, setErrors] = useState({});
    const [statusOpen, setStatusOpen] = useState(false);
    const [dateOpen, setDateOpen] = useState(false);
    const [timeOpen, setTimeOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => new Date());
    const [mapOpen, setMapOpen] = useState(false);
    const [mapCoordinates, setMapCoordinates] = useState(null);
    const [mapSearch, setMapSearch] = useState("");
    const [mapCenter, setMapCenter] = useState([41.9, 12.5]);
    const [mapSearchLoading, setMapSearchLoading] = useState(false);
    const [mapSearchError, setMapSearchError] = useState("");
    const mapSearchInputRef = useRef(null);
    const mapModalRef = useRef(null);

    useEffect(() => {
        if (!mapOpen) return;
        mapModalRef.current?.scrollTo({ top: 0, behavior: "auto" });
        mapSearchInputRef.current?.focus({ preventScroll: true });
        requestAnimationFrame(() => mapModalRef.current?.scrollTo({ top: 0, behavior: "auto" }));
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, [mapOpen]);

    const calendarDays = getCalendarDays(calendarMonth);
    const selectedDate = form.eventDate ? new Date(`${form.eventDate}T00:00:00`) : null;
    const monthLabel = calendarMonth.toLocaleDateString("it-IT", {
        month: "long",
        year: "numeric",
    });
    const [selectedHour, selectedMinute] = form.eventTime ? form.eventTime.split(":") : ["", ""];

    const onChange = (e) => {
        const { name, value, files } = e.target;

        if (files && files.length > 0) {
            if (name === "uploadedFile" && files[0].size > MAX_IMAGE_SIZE) {
                e.target.value = "";
                setErrors((prev) => ({ ...prev, uploadedFile: "Immagine troppo grande. Scegli un file più piccolo." }));
                return;
            }

            setErrors((prev) => ({ ...prev, uploadedFile: "" }));
            setForm((prev) => ({ ...prev, [name]: files[0] }));
            return;
        }

        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        const next = {};

        if (!form.title.trim()) next.title = "Titolo obbligatorio";
        else if (form.title.trim().length < 3) next.title = "Minimo 3 caratteri";
        else if (form.title.trim().length > 256) next.title = "Massimo 256 caratteri";

        if (!form.description.trim()) next.description = "Descrizione obbligatoria";
        else if (form.description.trim().length < 3) next.description = "Minimo 3 caratteri";

        const allowed = ["public", "draft", "delete", "archived"];
        if (!allowed.includes(form.status)) next.status = "Stato non valido";

        const tags = form.tagText
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

        const invalidTag = tags.find((t) => t.length < 3 || t.length > 24);
        if (invalidTag) next.tagText = "Ogni tag deve avere tra 3 e 24 caratteri";

        setErrors(next);
        return { ok: Object.keys(next).length === 0, tags };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { ok, tags } = validate();
        if (!ok) return;

        const formData = new FormData();
        formData.append("title", form.title.trim());
        formData.append("description", form.description.trim());
        formData.append("status", form.status);
        formData.append("tag", JSON.stringify(tags));
        if (form.locality.trim()) formData.append("locality", form.locality.trim());
        if (form.eventDate?.trim()) {
            const time = form.eventTime?.trim() || "00:00";
            formData.append("eventDate", `${form.eventDate.trim()}T${time}:00`);
        }
        if (form.imagePost?.trim()) formData.append("imagePost", form.imagePost.trim());
        if (form.uploadedFile) formData.append("uploadedFile", form.uploadedFile);
        if (form.coordinates) {
            formData.append("latitude", String(form.coordinates[0]));
            formData.append("longitude", String(form.coordinates[1]));
        }

        try {
            if (form.coordinates && form.eventDate) {
                try {
                    const weather = await getWeatherForDate({
                        latitude: form.coordinates[0],
                        longitude: form.coordinates[1],
                        date: form.eventDate,
                    });
                    formData.append("weather", JSON.stringify(weather));
                } catch {
                    toast.warning("Post creato senza dati meteo: servizio non disponibile");
                }
            }

            await createPost(formData, user?.accessToken);
            toast.success("Post creato con successo");
            navigate("/posts");
        } catch (err) {
            if (err.status === 401) {
                dispatch(clearUser());
                navigate("/login", { replace: true });
                toast.error("Sessione scaduta. Accedi nuovamente.");
                return;
            }
            toast.error(err?.message || "Errore nella creazione del post");
        }
    };

    return (
        <Card title="Nuovo allenamento" >
            <div className={styles.wrapper}>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="title">Luogo*</label>
                        <input
                            id="title"
                            name="title"
                            className={styles.input}
                            value={form.title}
                            onChange={onChange}
                            placeholder="Luogo dell'attività"
                        />
                        {errors.title && <small className={styles.error}>{errors.title}</small>}
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="description">Inserisci in dettaglio il ritrovo*</label>
                        <textarea
                            id="description"
                            name="description"
                            className={styles.textarea}
                            value={form.description}
                            onChange={onChange}
                            placeholder="Per esempio: Davanti al bar"
                        />
                        {errors.description && <small className={styles.error}>{errors.description}</small>}
                    </div>
                        <div className={`${styles.field} ${styles.eventDateField}`}>
                            <label className={styles.label} htmlFor="eventDate">Data appuntamento*</label>
                            <div className={styles.datePicker}>
                                <button
                                    id="eventDate"
                                    type="button"
                                    className={`${styles.dateTrigger} ${form.eventDate ? styles.dateSelected : ""}`}
                                    aria-expanded={dateOpen}
                                    aria-haspopup="dialog"
                                    onClick={() => setDateOpen((open) => !open)}
                                >
                                    <span>{selectedDate
                                        ? selectedDate.toLocaleDateString("it-IT")
                                        : "Seleziona una data"}</span>
                                    <span className={styles.calendarIcon} aria-hidden="true" />
                                </button>
                                {dateOpen && (
                                    <div className={styles.calendar} role="dialog" aria-label="Seleziona data post">
                                        <div className={styles.calendarHeader}>
                                            <button
                                                type="button"
                                                className={styles.calendarNav}
                                                aria-label="Mese precedente"
                                                onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}
                                            >
                                                ‹
                                            </button>
                                            <strong>{monthLabel}</strong>
                                            <button
                                                type="button"
                                                className={styles.calendarNav}
                                                aria-label="Mese successivo"
                                                onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}
                                            >
                                                ›
                                            </button>
                                        </div>
                                        <div className={styles.weekDays}>
                                            {weekDays.map((day) => <span key={day}>{day}</span>)}
                                        </div>
                                        <div className={styles.calendarGrid}>
                                            {calendarDays.map((date, index) => date ? (
                                                <button
                                                    key={toDateValue(date)}
                                                    type="button"
                                                    className={`${styles.calendarDay} ${selectedDate && toDateValue(selectedDate) === toDateValue(date) ? styles.calendarDaySelected : ""}`}
                                                    onClick={() => {
                                                        setForm((prev) => ({ ...prev, eventDate: toDateValue(date) }));
                                                        setDateOpen(false);
                                                    }}
                                                >
                                                    {date.getDate()}
                                                </button>
                                            ) : <span key={`empty-${index}`} />)}
                                        </div>
                                        {form.eventDate && (
                                            <button
                                                type="button"
                                                className={styles.clearDate}
                                                onClick={() => {
                                                    setForm((prev) => ({ ...prev, eventDate: "" }));
                                                    setDateOpen(false);
                                                }}
                                            >
                                                Cancella data
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                    <div className={`${styles.field} ${styles.timeField}`}>
                        <label className={styles.label} htmlFor="eventTime">Orario appuntamento (opzionale)</label>
                        <div className={styles.datePicker}>
                            <button
                                id="eventTime"
                                type="button"
                                className={`${styles.dateTrigger} ${form.eventTime ? styles.dateSelected : ""}`}
                                aria-expanded={timeOpen}
                                aria-haspopup="dialog"
                                onClick={() => setTimeOpen((open) => !open)}
                            >
                                <span>{form.eventTime || "Seleziona un orario"}</span>
                                <span className={styles.clockIcon} aria-hidden="true" />
                            </button>
                            {timeOpen && (
                                <div className={styles.timePanel} role="dialog" aria-label="Seleziona orario appuntamento">
                                    <div className={styles.timeColumns}>
                                        <div className={styles.timeColumn} role="listbox" aria-label="Ore">
                                            {hourOptions.map((h) => (
                                                <button
                                                    key={h}
                                                    type="button"
                                                    className={`${styles.timeOption} ${selectedHour === h ? styles.timeOptionActive : ""}`}
                                                    onClick={() => setForm((prev) => ({ ...prev, eventTime: `${h}:${selectedMinute || "00"}` }))}
                                                >
                                                    {h}
                                                </button>
                                            ))}
                                        </div>
                                        <div className={styles.timeColumn} role="listbox" aria-label="Minuti">
                                            {minuteOptions.map((m) => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    className={`${styles.timeOption} ${selectedMinute === m ? styles.timeOptionActive : ""}`}
                                                    onClick={() => setForm((prev) => ({ ...prev, eventTime: `${selectedHour || "00"}:${m}` }))}
                                                >
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={styles.timeActions}>
                                        <button
                                            type="button"
                                            className={styles.timeConfirm}
                                            onClick={() => {
                                                setForm((prev) => ({ ...prev, eventTime: prev.eventTime || `${selectedHour || "00"}:${selectedMinute || "00"}` }));
                                                setTimeOpen(false);
                                            }}
                                        >
                                            Conferma orario
                                        </button>
                                        {form.eventTime && (
                                            <button
                                                type="button"
                                                className={styles.timeClear}
                                                onClick={() => {
                                                    setForm((prev) => ({ ...prev, eventTime: "" }));
                                                    setTimeOpen(false);
                                                }}
                                            >
                                                Cancella orario
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.field}>
                            <span className={styles.label} id="add-status-label">Stato</span>
                            <div className={styles.statusSelect}>
                                <button
                                    type="button"
                                    className={styles.statusTrigger}
                                    aria-expanded={statusOpen}
                                    aria-haspopup="listbox"
                                    aria-labelledby="add-status-label"
                                    onClick={() => setStatusOpen((open) => !open)}
                                >
                                    {statusOptions.find((option) => option.value === form.status)?.label}
                                    <span className={styles.statusChevron} aria-hidden="true" />
                                </button>
                                {statusOpen && (
                                    <div className={styles.statusMenu} role="listbox" aria-labelledby="add-status-label">
                                        {statusOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                role="option"
                                                aria-selected={form.status === option.value}
                                                className={`${styles.statusOption} ${form.status === option.value ? styles.statusOptionActive : ""}`}
                                                onClick={() => {
                                                    setForm((prev) => ({ ...prev, status: option.value }));
                                                    setStatusOpen(false);
                                                }}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {errors.status && <small className={styles.error}>{errors.status}</small>}
                        </div>

                        
                    </div>



                    <div className={styles.field}>
                        <span className={styles.label}>Luogo in mappa</span>
                        <button
                            type="button"
                            className={styles.mapPickerButton}
                            onClick={() => {
                                window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                                setMapCoordinates(null);
                                setMapSearchError("");
                                setMapOpen(true);
                            }}
                        >
                            <span className={styles.mapPin} aria-hidden="true">⌖</span>
                            {form.locality ? "Modifica luogo sulla mappa" : "Scegli un luogo sulla mappa"}
                        </button>
                        {form.locality && (
                            <a
                                className={styles.mapLink}
                                href={form.locality}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Apri il luogo selezionato
                            </a>
                        )}
                    </div>

                    {mapOpen && (
                        <div className={styles.mapModalBackdrop} role="presentation" onMouseDown={() => setMapOpen(false)}>
                            <div
                                ref={mapModalRef}
                                className={styles.mapModal}
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="map-modal-title"
                                onMouseDown={(event) => event.stopPropagation()}
                            >
                                <div className={styles.mapModalHeader}>
                                    <div>
                                        <span className={styles.mapEyebrow}>Luogo dell’attività</span>
                                        <h2 id="map-modal-title">Scegli sulla mappa</h2>
                                    </div>
                                    <button type="button" className={styles.mapClose} aria-label="Chiudi" onClick={() => setMapOpen(false)}>×</button>
                                </div>
                                <p className={styles.mapHelp}>
                                    Cerca prima la città, poi clicca sulla mappa per scegliere il punto preciso.
                                </p>
                                <div className={styles.mapSearchRow}>
                                    <input
                                        ref={mapSearchInputRef}
                                        className={styles.input}
                                        value={mapSearch}
                                        onChange={(event) => setMapSearch(event.target.value)}
                                        placeholder="Scrivi una città, per esempio Milano"
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") event.currentTarget.nextElementSibling.click();
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className={styles.mapOpenButton}
                                        disabled={!mapSearch.trim() || mapSearchLoading}
                                        onClick={async () => {
                                            setMapSearchLoading(true);
                                            setMapSearchError("");
                                            try {
                                                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(mapSearch.trim())}`);
                                                if (!response.ok) throw new Error("Ricerca non disponibile");
                                                const results = await response.json();
                                                if (!results.length) {
                                                    setMapSearchError("Città non trovata. Prova con un altro nome.");
                                                    return;
                                                }
                                                const center = [Number(results[0].lat), Number(results[0].lon)];
                                                setMapCenter(center);
                                                setMapCoordinates(center);
                                            } catch {
                                                setMapSearchError("Non riesco a cercare la città. Riprova.");
                                            } finally {
                                                setMapSearchLoading(false);
                                            }
                                        }}
                                    >
                                        {mapSearchLoading ? "Cerco..." : "Cerca città"}
                                    </button>
                                </div>
                                {mapSearchError && <small className={styles.mapSearchError}>{mapSearchError}</small>}
                                <MapContainer
                                    center={mapCenter}
                                    zoom={5}
                                    className={styles.mapCanvas}
                                    scrollWheelZoom
                                >
                                    <TileLayer
                                        attribution='&copy; OpenStreetMap contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <MapCenterController center={mapCenter} />
                                    <MapClickHandler onSelect={setMapCoordinates} />
                                    {mapCoordinates && (
                                        <CircleMarker
                                            center={mapCoordinates}
                                            radius={10}
                                            pathOptions={{ color: "#ee6f68", fillColor: "#ee6f68", fillOpacity: 0.85 }}
                                        />
                                    )}
                                </MapContainer>
                                {mapCoordinates && (
                                    <p className={styles.coordinatesText}>
                                        Punto selezionato: {mapCoordinates[0].toFixed(5)}, {mapCoordinates[1].toFixed(5)}
                                    </p>
                                )}
                                <div className={styles.mapModalActions}>
                                    <button type="button" className={styles.secondaryBtn} onClick={() => setMapOpen(false)}>Annulla</button>
                                    <button
                                        type="button"
                                        className={styles.primaryBtn}
                                        disabled={!mapCoordinates}
                                        onClick={() => {
                                            const [latitude, longitude] = mapCoordinates;
                                            const locationLink = `https://www.google.com/maps/@${latitude},${longitude},17z`;
                                            setForm((prev) => ({
                                                ...prev,
                                                locality: locationLink,
                                                coordinates: [latitude, longitude],
                                            }));
                                            setMapOpen(false);
                                        }}
                                    >
                                        Usa questo punto
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="uploadedFile">Immagine copertina</label>
                        <input
                            id="uploadedFile"
                            name="uploadedFile"
                            className={styles.input}
                            type="file"
                            accept="image/*"
                            onChange={onChange}
                        />
                        {errors.uploadedFile && <small className={styles.error}>{errors.uploadedFile}</small>}
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={() => navigate("/posts")}
                        >
                            Annulla
                        </button>
                        <button type="submit" className={styles.primaryBtn}>
                            Salva Post
                        </button>
                    </div>
                </form>
            </div>
        </Card>
    );
};

export default AddPost;