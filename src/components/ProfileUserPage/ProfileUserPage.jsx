import { useState, useEffect } from "react";
import styles from "./ProfileUserPage.module.css";
import { profileUserUpdate } from "../services/profileUserUpdate.service.js";
import { getProfile } from "../services/profileUser.service.js";
import Input from "../Input/Input.component.jsx";
import Card from "../Card/Card.jsx";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { userSelectors } from "../../reducers/user.slice"; // adatta il path

const ProfileUserPage = () => {
    const navigate = useNavigate();
    const user = useSelector(userSelectors.selectUser);

    const [formValue, setFormValue] = useState({
        nome: "",
        email: "",
    });

    const [nomeError, setNomeError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [serverError, setServerError] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await getProfile(user?.accessToken);
                setFormValue((prev) => ({ ...prev, nome: data.name, email: data.email }));
            } catch (error) {
                console.error("Errore nel recupero del profilo:", error);
            }
        };
        fetchProfile();
    }, [user?.accessToken]);

    const handleChange = (e) => {
        setFormValue({ ...formValue, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setNomeError("");
        setEmailError("");
        setServerError("");
        let hasError = false;

        if (!formValue.nome || formValue.nome.trim() === "") {
            setNomeError("Nome obbligatorio");
            hasError = true;
        } else if (formValue.nome.length < 3) {
            setNomeError("Il nome deve essere lungo almeno 3 caratteri");
            hasError = true;
        }

        if (!formValue.email || formValue.email.trim() === "") {
            setEmailError("Email obbligatoria");
            hasError = true;
        } else if (!/\S+@\S+\.\S+/.test(formValue.email)) {
            setEmailError("Email non valida");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        try {
            await profileUserUpdate(user?.accessToken, {
                name: formValue.nome,
                email: formValue.email,
            });
            toast.success("Profilo aggiornato con successo");
            navigate("/profile");
        } catch (error) {
            setServerError(error.message);
            toast.error("Aggiornamento profilo fallito");
        }
    };

    const nomeOk = formValue.nome.trim().length >= 3;
    const emailOk = /\S+@\S+\.\S+/.test(formValue.email);

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
                        id="email"
                        label="Email"
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formValue.email}
                        error={emailError}
                        status={emailError ? "error" : emailOk ? "success" : ""}
                        onChange={handleChange}
                        htmlFor="email"
                        readOnly
                    />

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