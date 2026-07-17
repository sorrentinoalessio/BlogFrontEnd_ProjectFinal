import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RegistrationForm from '../../components/RegistrationForm/RegistrationForm.jsx'
import { toast } from 'react-toastify'
import { signUp } from '../../components/services/registration.service.js'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => navigateMock,
}))
vi.mock('../../components/services/registration.service.js', () => ({ signUp: vi.fn() }))
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const renderForm = () => {
  const user = userEvent.setup()
  render(<MemoryRouter><RegistrationForm /></MemoryRouter>)
  return { user }
}

describe('RegitrationForm success', () => {
  it('mostra il bottone registrati', () => {
    renderForm()
    expect(screen.getByRole('button', { name: /registrati/i })).toBeInTheDocument()
  })

  it('contiene i campi name, email, password, conferma password,', () => {
    renderForm()
    expect(document.querySelector('input[name="nome"]')).toBeInTheDocument()
    expect(document.querySelector('input[name="email"]')).toBeInTheDocument()
    expect(document.querySelector('input[name="password"]')).toBeInTheDocument()
    expect(document.querySelector('input[name="confermaPassword"]')).toBeInTheDocument()
  })

  it('la card contiene un heading Registrati', () => {
    renderForm()
    const card = screen.getByTestId('card-component')
    expect(within(card).getByRole('heading', { name: /registrati/i })).toBeInTheDocument()
  })

  it('registrazione con successo: toast, e navigazione', async () => {
    const { signUp } = await import('../../components/services/registration.service.js')
    const { user } = renderForm()

    await user.type(screen.getByLabelText(/nome/i), 'Test User')
    await user.type(screen.getByLabelText(/indirizzo email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^Password$/i), 'password123')
    await user.type(screen.getByLabelText(/^conferma password$/i), 'password123')
    await user.click(screen.getByRole('button', { name: /registrati/i }))

    expect(screen.getByLabelText(/indirizzo email/i)).toHaveValue('test@example.com')
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('registrazione avvenuta con successo, conferma la tua email')
      expect(navigateMock).toHaveBeenCalledWith('/login')
    })
  })
})

describe('RegitrationForm inserimento dati non validi', () => {
  it('Email non valida', async () => {
    const { user } = renderForm()
    await user.type(screen.getByLabelText(/indirizzo email/i), 'email_non_valida')
    await user.click(screen.getByRole('button', { name: /registrati/i }))
    expect(await screen.findByText(/^email non valida$/i)).toBeInTheDocument()
  })

  it('nome, email, password obbligatorie', async () => {
    const { user } = renderForm()
    // I campi sono già vuoti, basta cliccare submit
    await user.click(screen.getByRole('button', { name: /registrati/i }))
    expect(await screen.findByText(/^Nome obbligatorio$/i)).toBeInTheDocument()
    expect(await screen.findByText(/^Email obbligatoria$/i)).toBeInTheDocument()
    expect(await screen.findByText(/^Password obbligatoria$/i)).toBeInTheDocument()
  })

  it('email non valida, password non coincidente', async () => {
    const { signUp } = await import('../../components/services/registration.service.js')
    const { user } = renderForm()

    await user.type(screen.getByLabelText(/^nome$/i), 'Test User')
    await user.type(screen.getByLabelText(/^indirizzo email$/i), 'testexample.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/^conferma password$/i), 'password12')
    await user.click(screen.getByRole('button', { name: /registrati/i }))

    expect(await screen.findByText(/^email non valida$/i)).toBeInTheDocument()
    expect(await screen.findByText(/^le password non coincidono$/i)).toBeInTheDocument()
  })

  it('Password troppo corta', async () => {
    const { user } = renderForm()
    await user.type(screen.getByLabelText(/^password$/i), 'pass')
    await user.click(screen.getByRole('button', { name: /registrati/i }))
    expect(await screen.findByText(/^La password deve essere lunga almeno 6 caratteri$/i)).toBeInTheDocument()
  })

  it('registrazione fallita', async () => {
   signUp.mockRejectedValueOnce(new Error('something went wrong')) // Simula un errore del server
    const { user } = renderForm()

    await user.type(screen.getByLabelText(/nome/i), 'Test User')
    await user.type(screen.getByLabelText(/indirizzo email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^Password$/i), 'password123')
    await user.type(screen.getByLabelText(/^conferma password$/i), 'password123')
    await user.click(screen.getByRole('button', { name: /registrati/i }))

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/indirizzo email/i)).toHaveValue('test@example.com')
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('registrazione fallita')
    })
  })
})