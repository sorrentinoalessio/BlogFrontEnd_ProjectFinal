import { useState } from "react";
import styles from "./RegistrationForm.module.css";
import { signUp } from "../services/registration.service.js";
import Input from "../Input/Input.component.jsx";
import Card from "../Card/Card.jsx";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const RegistrationForm = () => {
    const navigate = useNavigate();

    const [formValue, setFormValue] = useState({
        nome: "",
        email: "",
        password: "",
        confermaPassword: "",
        timeForHundredMeters: "",
    });

    const [nomeError, setNomeError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [confermaPasswordError, setConfermaPasswordError] = useState("");
    const [timeForHundredMetersError, setTimeForHundredMetersError] = useState("");
    const [serverError, setServerError] = useState("");

    const handleChange = (e) => {
        setFormValue({ ...formValue, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setNomeError("");
        setEmailError("");
        setPasswordError("");
        setConfermaPasswordError("");
        setTimeForHundredMetersError("");
        setServerError("");
        let hasError = false;

        if (!formValue.nome || formValue.nome.trim() === "") {
            setNomeError("Nome obbligatorio");
            hasError = true;
        }
        if (!formValue.email || formValue.email.trim() === "") {
            setEmailError("Email obbligatoria");
            hasError = true;
        } else if (!formValue.email.includes("@") || !formValue.email.includes(".")) {
            setEmailError("Email non valida");
            hasError = true;
        }
        if (!formValue.password || formValue.password.trim() === "") {
            setPasswordError("Password obbligatoria");
            hasError = true;
        } else if (formValue.password.length < 6) {
            setPasswordError("La password deve essere lunga almeno 6 caratteri");
            hasError = true;
        }
        if (!formValue.confermaPassword || formValue.confermaPassword.trim() === "") {
            setConfermaPasswordError("Conferma la password");
            hasError = true;
        } else if (formValue.password !== formValue.confermaPassword) {
            setConfermaPasswordError("Le password non coincidono");
            hasError = true;
        }
        if (!formValue.timeForHundredMeters || Number(formValue.timeForHundredMeters) <= 0) {
            setTimeForHundredMetersError("Inserisci un tempo valido in secondi");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        try {
            await signUp({
                name: formValue.nome,
                email: formValue.email,
                password: formValue.password,
                timeForHundredMeters: Number(formValue.timeForHundredMeters),
            });
            toast.success("registrazione avvenuta con successo, conferma la tua email");
            navigate("/login");
        } catch (error) {
            setServerError(error.message);
            toast.error("registrazione fallita");
        }
    };

    const nomeOk = formValue.nome.trim() !== "";

    const emailOk =
        formValue.email.trim() !== "" &&
        formValue.email.includes("@") &&
        formValue.email.includes(".");

    const passwordOk =
        formValue.password.trim() !== "" && formValue.password.length >= 6;

    const confermaPasswordOk =
        formValue.confermaPassword.trim() !== "" &&
        formValue.password === formValue.confermaPassword;

    const timeForHundredMetersOk = Number(formValue.timeForHundredMeters) > 0;

    return (
        <Card title="Registrati">
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.form_field}>
                    <Input
                        id="nome"
                        label="Nome*"
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
                        label="Indirizzo email*"
                        type="text"
                        name="email"
                        placeholder="Email"
                        value={formValue.email}
                        error={emailError}
                        status={emailError ? "error" : emailOk ? "success" : ""}
                        onChange={handleChange}
                        htmlFor="email"
                    />
                    <Input
                        id="password"
                        label="Password*"
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formValue.password}
                        error={passwordError}
                        status={passwordError ? "error" : passwordOk ? "success" : ""}
                        onChange={handleChange}
                        htmlFor="password"
                    />
                    <Input
                        id="confermaPassword"
                        label="Conferma password*"
                        type="password"
                        name="confermaPassword"
                        placeholder="Conferma password"
                        value={formValue.confermaPassword}
                        error={confermaPasswordError}
                        status={confermaPasswordError ? "error" : confermaPasswordOk ? "success" : ""}
                        onChange={handleChange}
                        htmlFor="confermaPassword"
                    />
                    <Input
                        id="timeForHundredMeters"
                        label="Tempo per 100 metri (minuti)*"
                        type="number"
                        name="timeForHundredMeters"
                        placeholder="es. 1.05"
                        value={formValue.timeForHundredMeters}
                        error={timeForHundredMetersError}
                        status={timeForHundredMetersError ? "error" : timeForHundredMetersOk ? "success" : ""}
                        onChange={handleChange}
                        htmlFor="timeForHundredMeters"
                    />

                    <button type="submit" className={styles.submitButton}>
                        Registrati
                    </button>

                    {serverError && <small className={styles.errorMessage}>{serverError}</small>}
                </div>
            </form>
        </Card>
    );
};

export default RegistrationForm;