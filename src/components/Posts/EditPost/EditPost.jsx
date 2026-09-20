import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Card from "../../Card/Card.jsx";
import styles from "./EditPost.module.css";
import { useSelector } from "react-redux";
import { userSelectors } from "../../../reducers/user.slice.js"; // adatta il path
import { editPost } from "../../services/editPost.service.js"; // adatta se getPostById sta in post.service
import { toast } from "react-toastify";
import { getPostDetails } from "../../services/postDetails.service.js";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

const normalizeImageUrl = (value) => {
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    const cleanValue = value.replace(/^\/+/, "");
    return `${import.meta.env.VITE_API_URL}/${cleanValue}`;
};

const weekDays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

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
    useMapEvents({ click: (event) => onSelect([event.latlng.lat, event.latlng.lng]) });
    return null;
};

const MapCenterController = ({ center }) => {
    const map = useMap();

    useEffect(() => {
        if (center) map.flyTo(center, 13, { duration: 0.8 });
    }, [center, map]);

    return null;
};

const statusOptions = [
    { value: "draft", label: "Non Pubblicato" },
    { value: "public", label: "Pubblicato" },
    { value: "archived", label: "Archiviato" },
    { value: "delete", label: "Eliminato" },
];

const EditPost = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const user = useSelector(userSelectors.selectUser);

    const [form, setForm] = useState({
        title: "",
        description: "",
        status: "draft",
        eventDate: "",
        locality: "",
        tagText: "",
        imagePost: "",
        uploadedFile: null,
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const [previewImage, setPreviewImage] = useState("");
    const [statusOpen, setStatusOpen] = useState(false);
    const [dateOpen, setDateOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => new Date());
    const [mapOpen, setMapOpen] = useState(false);
    const [mapCoordinates, setMapCoordinates] = useState(null);
    const [mapSearch, setMapSearch] = useState("");
    const [mapCenter, setMapCenter] = useState([41.9, 12.5]);
    const [mapSearchLoading, setMapSearchLoading] = useState(false);
    const [mapSearchError, setMapSearchError] = useState("");

    const calendarDays = getCalendarDays(calendarMonth);
    const selectedDate = form.eventDate ? new Date(`${form.eventDate}T00:00:00`) : null;
    const monthLabel = calendarMonth.toLocaleDateString("it-IT", {
        month: "long",
        year: "numeric",
    });

    // converte il post (dal state di navigazione o dalla fetch) nello shape del form
    const populateForm = (post) => {
        if (!post) return;
        const existingImageUrl = post.imagePost ?? post.img ?? "";
        const normalizedImageUrl = normalizeImageUrl(existingImageUrl);
        setForm({
            title: post.title ?? "",
            description: post.description ?? "",
            status: post.status ?? "draft",
            eventDate: post.creationDate
                ? new Date(post.creationDate).toISOString().slice(0, 10)
                : "",
            locality: post.locality ?? post.location ?? "",
            tagText: Array.isArray(post.tag)
                ? post.tag.map((t) => (typeof t === "string" ? t : t.tag)).join(", ")
                : "",
            imagePost: "",
            uploadedFile: null,
        });
        setPreviewImage(normalizedImageUrl);
    };

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }

        (async () => {
            try {
                const data = await getPostDetails(id, user?.accessToken);
                const post = Array.isArray(data) ? data[0] : data;
                populateForm(post ?? location.state?.post);
            } catch (err) {
                const postFromState = location.state?.post;
                if (postFromState) {
                    populateForm(postFromState);
                } else {
                    toast.error(err?.message || "Errore nel caricamento del post");
                    navigate("/posts");
                }
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, user?.accessToken]);

    useEffect(() => {
        return () => {
            if (previewImage?.startsWith("blob:")) {
                URL.revokeObjectURL(previewImage);
            }
        };
    }, [previewImage]);

    const onChange = (e) => {
        const { name, value, files } = e.target;

        if (files && files.length > 0) {
            const selectedFile = files[0];
            setForm((prev) => ({ ...prev, [name]: selectedFile, imagePost: "" }));
            setPreviewImage(URL.createObjectURL(selectedFile));
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
        if (form.eventDate?.trim()) formData.append("eventDate", form.eventDate.trim());
        if (form.imagePost?.trim()) formData.append("imagePost", form.imagePost.trim());
        if (form.uploadedFile) formData.append("uploadedFile", form.uploadedFile);

        try {
            await editPost(id, formData, user?.accessToken);
            toast.success("Post modificato con successo");
            navigate("/posts", { replace: true });
        } catch (err) {
            toast.error(err?.message || "Errore nella modifica del post");
        }
    };

    if (loading) return <p>Caricamento...</p>;

    return (
        <Card title="Modifica richiesta" >
            <div className={styles.wrapper}>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={`${styles.field} ${styles.mapField}`}>
                        <span className={styles.label}>Luogo in mappa</span>
                        <button
                            type="button"
                            className={styles.mapPickerButton}
                            onClick={() => {
                                setMapCoordinates(null);
                                setMapSearchError("");
                                setMapOpen(true);
                            }}
                        >
                            <span className={styles.mapPin} aria-hidden="true">⌖</span>
                            {form.locality ? "Modifica luogo sulla mappa" : "Scegli un luogo sulla mappa"}
                        </button>
                        {form.locality && (
                            <a className={styles.mapLink} href={form.locality} target="_blank" rel="noreferrer">
                                Apri il luogo selezionato
                            </a>
                        )}
                    </div>

                    {mapOpen && (
                        <div className={styles.mapModalBackdrop} role="presentation" onMouseDown={() => setMapOpen(false)}>
                            <div className={styles.mapModal} role="dialog" aria-modal="true" aria-labelledby="edit-map-title" onMouseDown={(event) => event.stopPropagation()}>
                                <div className={styles.mapModalHeader}>
                                    <div>
                                        <span className={styles.mapEyebrow}>Luogo dell’attività</span>
                                        <h2 id="edit-map-title">Scegli sulla mappa</h2>
                                    </div>
                                    <button type="button" className={styles.mapClose} aria-label="Chiudi" onClick={() => setMapOpen(false)}>×</button>
                                </div>
                                <p className={styles.mapHelp}>Cerca prima la città, poi clicca sulla mappa per scegliere il punto preciso.</p>
                                <div className={styles.mapSearchRow}>
                                    <input
                                        className={styles.input}
                                        value={mapSearch}
                                        onChange={(event) => setMapSearch(event.target.value)}
                                        placeholder="Scrivi una città, per esempio Milano"
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
                                <MapContainer center={mapCenter} zoom={5} className={styles.mapCanvas} scrollWheelZoom>
                                    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <MapCenterController center={mapCenter} />
                                    <MapClickHandler onSelect={setMapCoordinates} />
                                    {mapCoordinates && <CircleMarker center={mapCoordinates} radius={10} pathOptions={{ color: "#ee6f68", fillColor: "#ee6f68", fillOpacity: 0.85 }} />}
                                </MapContainer>
                                {mapCoordinates && <p className={styles.coordinatesText}>Punto selezionato: {mapCoordinates[0].toFixed(5)}, {mapCoordinates[1].toFixed(5)}</p>}
                                <div className={styles.mapModalActions}>
                                    <button type="button" className={styles.secondaryBtn} onClick={() => setMapOpen(false)}>Annulla</button>
                                    <button
                                        type="button"
                                        className={styles.primaryBtn}
                                        disabled={!mapCoordinates}
                                        onClick={() => {
                                            const [latitude, longitude] = mapCoordinates;
                                            setForm((prev) => ({ ...prev, locality: `https://www.google.com/maps/@${latitude},${longitude},17z` }));
                                            setMapOpen(false);
                                        }}
                                    >
                                        Usa questo punto
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={`${styles.field} ${styles.titleField}`}>
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

                    <div className={`${styles.field} ${styles.descriptionField}`}>
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
                     <div className={styles.field}>
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

                    <div className={styles.row}>
                        <div className={styles.field}>
                            <span className={styles.label} id="status-label">Stato</span>
                            <div className={styles.statusSelect}>
                                <button
                                    type="button"
                                    className={styles.statusTrigger}
                                    aria-expanded={statusOpen}
                                    aria-haspopup="listbox"
                                    aria-labelledby="status-label"
                                    onClick={() => setStatusOpen((open) => !open)}
                                >
                                    {statusOptions.find((option) => option.value === form.status)?.label}
                                    <span className={styles.statusChevron} aria-hidden="true" />
                                </button>
                                {statusOpen && (
                                    <div className={styles.statusMenu} role="listbox" aria-labelledby="status-label">
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

                                        {previewImage && (
                        <div className={styles.previewWrapper}>
                            <img
                                className={styles.previewImage}
                                src={previewImage}
                                alt="Anteprima immagine del post"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                }}
                            />
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

export default EditPost;