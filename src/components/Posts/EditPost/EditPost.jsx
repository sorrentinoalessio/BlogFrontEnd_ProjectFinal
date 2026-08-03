import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Card from "../../Card/Card.jsx";
import styles from "./EditPost.module.css";
import { useSelector } from "react-redux";
import { userSelectors } from "../../../reducers/user.slice.js"; // adatta il path
import { editPost } from "../../services/editPost.service.js"; // adatta se getPostById sta in post.service
import { toast } from "react-toastify";
import { getPost } from "../../services/post.service.js"; // adatta il path

const EditPost = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const user = useSelector(userSelectors.selectUser);

    const [form, setForm] = useState({
        title: "",
        description: "",
        status: "draft",
        datePost: "",
        tagText: "",
        imagePost: "",
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);

    // converte il post (dal state di navigazione o dalla fetch) nello shape del form
    const populateForm = (post) => {
        if (!post) return;
        setForm({
            title: post.title ?? "",
            description: post.description ?? "",
            status: post.status ?? "draft",
            datePost: post.creationDate
                ? new Date(post.creationDate).toISOString().slice(0, 10)
                : "",
            tagText: Array.isArray(post.tag)
                ? post.tag.map((t) => (typeof t === "string" ? t : t.tag)).join(", ")
                : "",
            imagePost: post.imagePost ?? "",
        });
    };

    useEffect(() => {
        const postFromState = location.state?.post;

        if (postFromState) {
            populateForm(postFromState);
            setLoading(false);
            return;
        }

        // fallback: refresh diretto sull'URL, niente state -> fetch by id
        if (id) {
            (async () => {
                try {
                    const post = await getPost(id, user?.accessToken);
                    populateForm(post);
                } catch (err) {
                    toast.error(err?.message || "Errore nel caricamento del post");
                    navigate("/posts");
                } finally {
                    setLoading(false);
                }
            })();
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const onChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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

        const { ok } = validate();
        if (!ok) return;

        const payload = {
            title: form.title.trim(),
            description: form.description.trim(),
            status: form.status,
            tag: form.tagText.split(",").map((t) => t.trim()).filter(Boolean),
            ...(form.imagePost?.trim() ? { imagePost: form.imagePost.trim() } : {}),
        };
        console.log("PAYLOAD", payload);

        try {
            // adatta alla firma reale del tuo service, es. editPost(id, payload, token)
            await editPost(id, payload, user?.accessToken);
            toast.success("Post modificato con successo");

        } catch (err) {
            toast.error(err?.message || "Errore nella modifica del post");
        }
    };

    if (loading) return <p>Caricamento...</p>;

    return (
        <Card title="Modifica post" >
            <div className={styles.wrapper}>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="title">Titolo</label>
                        <input
                            id="title"
                            name="title"
                            className={styles.input}
                            value={form.title}
                            onChange={onChange}
                            placeholder={"Titolo del post"}
                        />
                        {errors.title && <small className={styles.error}>{errors.title}</small>}
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="description">Descrizione</label>
                        <textarea
                            id="description"
                            name="description"
                            className={styles.textarea}
                            value={form.description}
                            onChange={onChange}
                            placeholder="Testo del post"
                        />
                        {errors.description && <small className={styles.error}>{errors.description}</small>}
                    </div>

                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="status">Stato</label>
                            <select
                                id="status"
                                name="status"
                                className={styles.select}
                                value={form.status}
                                onChange={onChange}
                            >
                                <option value="draft">Bozza</option>
                                <option value="public">Pubblicato</option>
                                <option value="archived">Archiviato</option>
                                <option value="delete">Eliminato</option>
                            </select>
                            {errors.status && <small className={styles.error}>{errors.status}</small>}
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="datePost">Data post (opzionale)</label>
                            <input
                                id="datePost"
                                name="datePost"
                                type="date"
                                className={styles.input}
                                value={form.datePost}
                                onChange={onChange}
                            />
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