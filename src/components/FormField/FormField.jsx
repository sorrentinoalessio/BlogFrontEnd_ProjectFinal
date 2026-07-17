// FormField.component.jsx
import styles from "./FormField.module.css";

const FormField = ({ id, label, error, children }) => {
  return (
    <div className={styles.formField}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children}
      {error && <p className={styles.errorMessage}>{error}</p>}
    </div>
  );
};

export default FormField;