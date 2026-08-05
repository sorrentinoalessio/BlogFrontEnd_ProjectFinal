import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Card from "../../Card/Card.jsx";
import styles from "./EditPost.module.css";
import { useSelector } from "react-redux";
import { userSelectors } from "../../../reducers/user.slice.js"; // adatta il path
import { editPost } from "../../services/editPost.service.js"; // adatta se getPostById sta in post.service
import { toast } from "react-toastify";
import { getPostDetails } from "../../services/postDetails.service.js";

const normalizeImageUrl = (value) => {
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    const cleanValue = value.replace(/^\/+/, "");
    return `${import.meta.env.VITE_API_URL}/${cleanValue}`;
};

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
        uploadedFile: null,
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const [previewImage, setPreviewImage] = useState("");

    // converte il post (dal state di navigazione o dalla fetch) nello shape del form
    const populateForm = (post) => {
        if (!post) return;
        const existingImageUrl = post.imagePost ?? post.img ?? "";
        const normalizedImageUrl = normalizeImageUrl(existingImageUrl);
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
        if (form.datePost?.trim()) formData.append("datePost", form.datePost.trim());
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

export default EditPost;