import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginForm from '../../components/LoginForm/LoginForm.component.jsx'
import { toast } from 'react-toastify'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => navigateMock,
}))
vi.mock('../../components/services/login.service.js', () => ({ signIn: vi.fn() }))
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const renderForm = () => {
  const user = userEvent.setup()
  render(<MemoryRouter><LoginForm /></MemoryRouter>)
  return { user }
}

describe('LoginForm success', () => {
  it('mostra il bottone login', () => {
    renderForm()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  
  it('i campi hanno i name corretti', () => {
    renderForm()
    expect(document.querySelector('input[name="email"]')).toBeInTheDocument()
    expect(document.querySelector('input[name="password"]')).toBeInTheDocument()
  })

  it('ha un link per la registrazione', () => {
    renderForm()
    expect(screen.getByRole('link', { name: /registrati/i })).toBeInTheDocument()
  })

  it('la card contiene un heading Login', () => {
    renderForm()
    const card = screen.getByTestId('card-component')
    expect(within(card).getByRole('heading', { name: /login/i })).toBeInTheDocument()
  })

  it('login con successo: toast, token e navigazione', async () => {
    const { signIn } = await import('../../components/services/login.service.js')
    signIn.mockResolvedValue({ accessToken: 'fake-token' })
    const { user } = renderForm()

    await user.type(screen.getByLabelText(/indirizzo email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Login effettuato')
      expect(localStorage.getItem('token')).toBe('fake-token')
      expect(navigateMock).toHaveBeenCalledWith('/posts')
    })
  })
})

describe('LoginForm inserimento dati non validi', () => {
  it('Email non valida', async () => {
    const { user } = renderForm()
    await user.type(screen.getByLabelText(/indirizzo email/i), 'email_non_valida')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /login/i }))
    expect(await screen.findByText(/email non valida/i)).toBeInTheDocument()
  })

  it('Password troppo corta', async () => {
    const { user } = renderForm()
    await user.type(screen.getByLabelText(/indirizzo email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'corta')
    await user.click(screen.getByRole('button', { name: /login/i }))
    expect(await screen.findByText(/La password deve essere lunga almeno 6 caratteri/i)).toBeInTheDocument()
  })

  it('email e password vuoti mostrano errori di validazione', async () => {
    const { user } = renderForm()
    await user.click(screen.getByRole('button', { name: /login/i }))
    await waitFor(() => {
      expect(screen.getByText(/email obbligatoria/i)).toBeInTheDocument()
      expect(screen.getByText(/password obbligatoria/i)).toBeInTheDocument()
    })
  })

  it('email o password sbagliate', async () => {
    const { signIn } = await import('../../components/services/login.service.js')
    signIn.mockRejectedValue({ response: { status: 401 } })
    const { user } = renderForm()

    await user.type(screen.getByLabelText(/indirizzo email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Errore nel login')
    })
  })
})