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

const ProfileUserPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector(userSelectors.selectUser);

    const [formValue, setFormValue] = useState({
        nome: "",
        status: "",
        avatar: "",
        avatarFile: null,
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

        return `http://127.0.0.1:3001/uploads/${filename}?t=${Date.now()}`;
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await getProfile(user?.accessToken);
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
                    email: data.email || data?.user?.email || prev.email,
                    status: data.status || data?.user?.status || prev.status,
                    avatar: currentAvatar,
                }));
            } catch (error) {
                console.error("Errore nel recupero del profilo:", error);
            }
        };
        fetchProfile();
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
            avatar: URL.createObjectURL(file),
        }));
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

            const avatarToStore = uploadedAvatar || formValue.avatar || user?.avatar || "";
            dispatch(
                setUser({
                    ...user,
                    name: formValue.nome,
                    avatar: avatarToStore,
                })
            );
            setFormValue((prev) => ({ ...prev, avatar: avatarToStore }));

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
