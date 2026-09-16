import { useState, useEffect } from "react";
import styles from "./ProfileUserPage.module.css";
import { profileUserUpdate } from "../services/profileUserUpdate.service.js";
import { uploadAvatar } from "../services/avatarUpload.service.js";
import { getProfile } from "../services/profileUser.service.js";
import Input from "../Input/Input.component.jsx";
import Card from "../Card/Card.jsx";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { userSelectors, setUser } from "../../reducers/user.slice";

const DEFAULT_AVATAR =
    "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=800&q=85";

const ProfileUserPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector(userSelectors.selectUser);

    const [formValue, setFormValue] = useState({
        nome: "",
        timeForHundredMeters: "",
        status: "",
        avatar: "",
        avatarFile: null,
        avatarRemoved: false,
    });

    const [nomeError, setNomeError] = useState("");

    const [serverError, setServerError] = useState("");

    const resolveAvatarUrl = (value) => {
        if (!value) return "";

        const extractAvatarValue = (candidate) => {
            if (!candidate) return "";
            if (typeof candidate === "string") return candidate;
            if (typeof candidate === "object") {
                if (candidate.avatar || candidate.avatarUrl || candidate.image || candidate.imageUrl || candidate.profileImage || candidate.profileImageUrl) {
                    return (
                        candidate.avatar ||
                        candidate.avatarUrl ||
                        candidate.image ||
                        candidate.imageUrl ||
                        candidate.profileImage ||
                        candidate.profileImageUrl
                    );
                }

                if (candidate.file) {
                    return extractAvatarValue(candidate.file);
                }

                if (candidate.user) {
                    return extractAvatarValue(candidate.user);
                }
            }

            return "";
        };

        const rawValue = extractAvatarValue(value);
        if (!rawValue || typeof rawValue !== "string") return "";

        const trimmedValue = rawValue.trim();
        if (!trimmedValue) return "";
        if (/^https?:\/\//i.test(trimmedValue) || trimmedValue.startsWith("data:") || trimmedValue.startsWith("blob:")) {
            return trimmedValue;
        }

        const forwardSlashed = trimmedValue.replace(/\\/g, "/");
        const pathParts = forwardSlashed.split("/").filter(Boolean);
        const filename = pathParts[pathParts.length - 1];

        if (!filename) return "";

        return `${import.meta.env.VITE_API_URL}/uploads/${filename}?t=${Date.now()}`;
    };

    useEffect(() => {
        if (!user?.accessToken) return undefined;

        let isMounted = true;

        const fetchProfile = async () => {
            try {
                const data = await getProfile(user.accessToken);
                if (!isMounted) return;

                const currentAvatar = resolveAvatarUrl(
                    data?.avatar ||
                    data?.avatarUrl ||
                    data?.image ||
                    data?.imageUrl ||
                    data?.profileImage ||
                    data?.profileImageUrl ||
                    data?.user?.avatar ||
                    data?.user?.avatarUrl ||
                    data?.user?.image ||
                    data?.user?.profileImage ||
                    user?.avatar ||
                    ""
                );

                setFormValue((prev) => ({
                    ...prev,
                    nome: data.name || data?.user?.name || prev.nome,
                    timeForHundredMeters:
                        data.timeForHundredMeters || data?.user?.timeForHundredMeters || prev.timeForHundredMeters,
                    email: data.email || data?.user?.email || prev.email,
                    status: data.status || data?.user?.status || prev.status,
                    avatar: currentAvatar,
                    avatarRemoved: false,
                }));
            } catch (error) {
                if (!isMounted) return;
                console.error("Errore nel recupero del profilo:", error);
            }
        };

        fetchProfile();

        return () => {
            isMounted = false;
        };
    }, [user?.accessToken]);

    const handleChange = (e) => {
        setFormValue({ ...formValue, [e.target.name]: e.target.value });
    };
    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0] || null;
        if (!file) {
            setFormValue((prev) => ({ ...prev, avatarFile: null }));
            return;
        }

        setFormValue((prev) => ({
            ...prev,
            avatarFile: file,
            avatarRemoved: false,
            avatar: URL.createObjectURL(file),
        }));
    };

    const handleRemoveAvatar = async () => {
        const confirmed = await new Promise((resolve) => {
            toast(
                ({ closeToast }) => (
                    <div className={styles.avatarConfirm}>
                        <strong>Sostituire l'immagine?</strong>
                        <span>Verrà usato l'avatar standard del nuoto.</span>
                        <div className={styles.avatarConfirmActions}>
                            <button
                                type="button"
                                className={styles.avatarCancelButton}
                                onClick={() => {
                                    closeToast();
                                    resolve(false);
                                }}
                            >
                                Annulla
                            </button>
                            <button
                                type="button"
                                className={styles.avatarConfirmButton}
                                onClick={() => {
                                    closeToast();
                                    resolve(true);
                                }}
                            >
                                Conferma
                            </button>
                        </div>
                    </div>
                ),
                { autoClose: false, closeOnClick: false, closeButton: false }
            );
        });
        if (!confirmed) return;

        setServerError("");

        try {
            const defaultAvatarResponse = await fetch(DEFAULT_AVATAR);
            if (!defaultAvatarResponse.ok) {
                throw new Error("Avatar standard non disponibile");
            }

            const defaultAvatarBlob = await defaultAvatarResponse.blob();
            const defaultAvatarFile = new File(
                [defaultAvatarBlob],
                "default-swimming-avatar.jpg",
                { type: defaultAvatarBlob.type || "image/jpeg" }
            );
            const uploadResponse = await uploadAvatar(user?.accessToken, defaultAvatarFile);
            const storedAvatar = resolveAvatarUrl(
                uploadResponse?.avatar ||
                uploadResponse?.file?.avatar ||
                uploadResponse?.file?.path ||
                uploadResponse?.file?.filename ||
                uploadResponse?.url ||
                uploadResponse?.file?.url
            );
            if (!storedAvatar) {
                throw new Error("Avatar standard non salvato");
            }

            dispatch(
                setUser({
                    name: formValue.nome,
                    userId: user?.userId,
                    accessToken: user?.accessToken,
                    refreshToken: user?.refreshToken,
                    avatar: storedAvatar,
                })
            );
            setFormValue((prev) => ({
                ...prev,
                avatar: storedAvatar,
                avatarFile: null,
                avatarRemoved: false,
            }));
            toast.success("Immagine sostituita con l'avatar standard");
        } catch (error) {
            setServerError(error.message);
            toast.error("Impossibile aggiornare l'immagine");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setNomeError("");
        setServerError("");
        let hasError = false;

        if (!formValue.nome || formValue.nome.trim() === "") {
            setNomeError("Nome obbligatorio");
            hasError = true;
        } else if (formValue.nome.length < 3) {
            setNomeError("Il nome deve essere lungo almeno 3 caratteri");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        try {
            await profileUserUpdate(user?.accessToken, {
                name: formValue.nome,
                timeForHundredMeters: String(formValue.timeForHundredMeters ?? "").trim(),
                ...(formValue.avatarRemoved ? { avatar: DEFAULT_AVATAR } : {}),
            });

            let uploadedAvatar = "";
            if (formValue.avatarFile) {
                const uploadResponse = await uploadAvatar(user?.accessToken, formValue.avatarFile);
                uploadedAvatar = resolveAvatarUrl(
                    uploadResponse?.avatar ||
                    uploadResponse?.file?.avatar ||
                    uploadResponse?.file?.path ||
                    uploadResponse?.file?.filename ||
                    uploadResponse?.url ||
                    uploadResponse?.file?.url ||
                    formValue.avatar
                );
            }

            const avatarToStore = formValue.avatarRemoved
                ? DEFAULT_AVATAR
                : uploadedAvatar || formValue.avatar || user?.avatar || "";
            dispatch(
                setUser({
                    name: formValue.nome,
                    userId: user?.userId,
                    accessToken: user?.accessToken,
                    refreshToken: user?.refreshToken,
                    avatar: avatarToStore,
                })
            );
            setFormValue((prev) => ({ ...prev, avatar: avatarToStore, avatarRemoved: false }));

            toast.success("Profilo aggiornato con successo");
            navigate("/profile");
        } catch (error) {
            setServerError(error.message);
            toast.error("Aggiornamento profilo fallito");
        }
    };

    const nomeOk = formValue.nome.trim().length >= 3;

    return (
        <Card title="Aggiorna Profilo">
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.form_field}>
                    <Input
                        id="nome"
                        label="Nome"
                        type="text"
                        name="nome"
                        placeholder="Nome"
                        value={formValue.nome}
                        error={nomeError}
                        status={nomeError ? "error" : nomeOk ? "success" : ""}
                        onChange={handleChange}
                        htmlFor="nome"
                    />

                    <Input
                        id="timeForHundredMeters"
                        label="Tempo per 100 metri"
                        type="text"
                        name="timeForHundredMeters"
                        placeholder="es. 1:45"
                        value={formValue.timeForHundredMeters}
                        onChange={handleChange}
                    />

                    <label className={styles.avatarLabel} htmlFor="avatar">
                        Immagine profilo
                    </label>
                    {formValue.avatar ? (
                        <img
                            src={formValue.avatar}
                            alt="Avatar attuale"
                            className={styles.avatarPreview}
                            onError={(e) => {
                                e.currentTarget.style.display = "none";
                                e.currentTarget.nextSibling.style.display = "flex";
                            }}
                        />
                        
                    ) : null}
                    <input
                        id="avatar"
                        name="avatar"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className={styles.fileInput}
                    />
                    {formValue.avatar && (
                        <button
                            type="button"
                            className={styles.removeAvatarButton}
                            onClick={handleRemoveAvatar}
                        >
                            Cancella immagine
                        </button>
                    )}
                    <div
                        className={styles.avatarFallback}
                        style={{ display: formValue.avatar ? "none" : "flex" }}
                    >
                        Nessun avatar
                    </div>
                    {formValue.avatar && (
                        <small className={styles.avatarUrl}></small>
                    )}


                    <button type="submit" className={styles.submitButton}>
                        Aggiorna Profilo
                    </button>

                    {serverError && <small className={styles.errorMessage}>{serverError}</small>}
                </div>
            </form>
        </Card>
    );
};

export default ProfileUserPage;
