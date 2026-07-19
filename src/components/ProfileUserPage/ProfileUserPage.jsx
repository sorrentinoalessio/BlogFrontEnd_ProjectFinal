import { useState, useEffect } from "react";
import styles from "./ProfileUserPage.module.css";
import { profileUserUpdate } from "../services/profileUserUpdate.service.js";
import { getProfile } from "../services/profileUser.service.js";
import Card from "../Card/Card.jsx";
import { toast } from "react-toastify";
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { userSelectors } from "../../reducers/user.slice"; // adatta il path


const ProfileUserPage = () => {
    const navigate = useNavigate();
    const user = useSelector(userSelectors.selectUser);

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

    const [formValue, setFormValue] = useState({
        nome: "",
        email: "",
    });

    const [errors, setErrors] = useState({
        nome: "",
        email: "",
    });

    const handleChange = (e) => {
        setErrors({ ...errors, [e.target.name]: "" });
        setFormValue({ ...formValue, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = { nome: "", email: "" };

        if (!formValue.nome || formValue.nome.trim() === "") {
            newErrors.nome = "Nome obbligatorio";
        } else if (formValue.nome.length < 3) {
            newErrors.nome = "Il nome deve essere lungo almeno 3 caratteri";
        }

        if (!formValue.email || formValue.email.trim() === "") {
            newErrors.email = "Email obbligatoria";
        } else if (!/\S+@\S+\.\S+/.test(formValue.email)) {
            newErrors.email = "Email non valida";
        }

        setErrors(newErrors);
        if (newErrors.nome || newErrors.email) return;

        try {
            await profileUserUpdate(user?.accessToken, {
                name: formValue.nome,
                email: formValue.email
            });
            toast.success("Profilo aggiornato con successo");
            navigate("/profile");
        } catch (error) {
            toast.error("Aggiornamento profilo fallito");
        }
    };

    const handleFetchProfile = async () => {
        try {
            const data = await getProfile(user?.accessToken);
            setFormValue({ ...formValue, nome: data.name, email: data.email });
        } catch (error) {
            console.error("Errore nel recupero del profilo:", error);
        }
    };


    return (
        <Card title="Aggiorna Profilo">
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.form_field}>
                    <label htmlFor="nome">Nome</label>
                    <input
                        type="text"
                        placeholder="Nome"
                        name="nome"
                        value={formValue.nome}
                        id="nome"
                        onChange={handleChange} />
                </div>
                {errors.nome && <small className={styles.errorMessage}>{errors.nome}</small>}

                <div className={styles.form_field}>
                    <label htmlFor="email">Email</label>
                    <input 
                        type="email"
                        placeholder="Email"
                        name="email"
                        value={formValue.email}
                        id="email"
                        onChange={handleChange} 
                        readOnly/>
                </div>
                {errors.email && <small className={styles.errorMessage}>{errors.email}</small>}

                <button type="submit" className={styles.submit_button}>
                    Aggiorna Profilo
                </button>
            </form>
        </Card>
    );
};

export default ProfileUserPage;