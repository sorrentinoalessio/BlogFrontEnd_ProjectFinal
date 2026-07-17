import FormField from "../FormField/FormField";
import styles from "../Card/Card.module.css";

const Input = ({ id, label, error, status = "", ...props }) => {
  return (
    <FormField id={id} label={label} error={error}>
      <input
        id={id}
        {...props}
        className={`${styles.input} ${status === "error" ? styles.inputError : ""} ${status === "success" ? styles.inputSuccess : ""}`}
      />
    </FormField>
  );
};

export default Input;