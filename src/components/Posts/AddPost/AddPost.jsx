import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../Card/Card.jsx";
import styles from "./AddPost.module.css";
import { useSelector } from "react-redux";
import { userSelectors } from "../../../reducers/user.slice.js"; // adatta il path

import { createPost } from "../../services/addPost.service.js";
import { toast } from "react-toastify";

const statusOptions = [
    { value: "draft", label: "Non Pubblicato" },
    { value: "public", label: "Pubblicato" },
    { value: "archived", label: "Archiviato" },
    { value: "delete", label: "Eliminato" },
];

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

const AddPost = () => {
    const navigate = useNavigate();
    const user = useSelector(userSelectors.selectUser);

    const [form, setForm] = useState({
        title: "",
        description: "",
        status: "draft",
        datePost: "",
        tagText: "",
        imagePost: "",
        uploadedFile: null,
    });

    const [errors, setErrors] = useState({});
    const [statusOpen, setStatusOpen] = useState(false);
    const [dateOpen, setDateOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => new Date());

    const calendarDays = getCalendarDays(calendarMonth);
    const selectedDate = form.datePost ? new Date(`${form.datePost}T00:00:00`) : null;
    const monthLabel = calendarMonth.toLocaleDateString("it-IT", {
        month: "long",
        year: "numeric",
    });

    const onChange = (e) => {
        const { name, value, files } = e.target;

        if (files && files.length > 0) {
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
        if (form.datePost?.trim()) formData.append("datePost", form.datePost.trim());
        if (form.imagePost?.trim()) formData.append("imagePost", form.imagePost.trim());
        if (form.uploadedFile) formData.append("uploadedFile", form.uploadedFile);

        try {
            await createPost(formData, user?.accessToken);
            toast.success("Post creato con successo");
            navigate("/posts");
        } catch (err) {
            toast.error(err?.message || "Errore nella creazione del post");
        }
    };

    return (
        <Card title="Nuova richiesta" >
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
                    <div className={styles.field}>
                            <label className={styles.label} htmlFor="datePost">Data appuntamento*</label>
                            <div className={styles.datePicker}>
                                <button
                                    id="datePost"
                                    type="button"
                                    className={`${styles.dateTrigger} ${form.datePost ? styles.dateSelected : ""}`}
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
                                                        setForm((prev) => ({ ...prev, datePost: toDateValue(date) }));
                                                        setDateOpen(false);
                                                    }}
                                                >
                                                    {date.getDate()}
                                                </button>
                                            ) : <span key={`empty-${index}`} />)}
                                        </div>
                                        {form.datePost && (
                                            <button
                                                type="button"
                                                className={styles.clearDate}
                                                onClick={() => {
                                                    setForm((prev) => ({ ...prev, datePost: "" }));
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
                        <label className={styles.label} htmlFor="tagText">Tag (separati da virgola)</label>
                        <input
                            id="tagText"
                            name="tagText"
                            className={styles.input}
                            value={form.tagText}
                            onChange={onChange}
                            placeholder="es. libro, romanzo, recensione"
                        />
                        {errors.tagText && <small className={styles.error}>{errors.tagText}</small>}
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="imagePost">URL immagine (opzionale)</label>
                        <input
                            id="imagePost"
                            name="imagePost"
                            className={styles.input}
                            value={form.imagePost}
                            onChange={onChange}
                            placeholder="https://..."
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="uploadedFile">Immagine del post</label>
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

export default AddPost;