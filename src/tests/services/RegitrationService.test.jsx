import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signUp } from "../../components/services/registration.service.js";

describe('signUp', () => {

  beforeEach(() => {
    vi.resetAllMocks() // Resetta i mock prima di ogni test
  })

  it('chiama fetch con i parametri corretti', async () => {
    //  Mock di fetch per simulare una risposta positiva
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({status: 200, message: 'registrazione avvenuta con successo, conferma la tua email' }),
    })

    // Act
    const result = await signUp({ name: 'Test User', email: 'test@example.com', password: 'password',confermaPassword: 'password' })

    // Assert
    expect(fetch).toHaveBeenCalledWith( // Controlla che fetch sia stato chiamato con i parametri corretti
      'http://127.0.0.1:3001/user',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test User', email: 'test@example.com', password: 'password',confermaPassword: 'password'}),
      }
    )
    expect(result).toEqual({status: 200, message: 'registrazione avvenuta con successo, conferma la tua email' })
  })

  it('lancia un errore se response.ok è false', async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Credenziali non valide' }),
    })

    // Act & Assert
    await expect(signUp({ name: 'Test User', email: 'test@example.com', password: 'wrong' }))
      .rejects
      .toThrow('Credenziali non valide')
  })

  it('lancia un errore generico se il server non restituisce un messaggio', async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}), // nessun campo message
    })

    // Act & Assert
    await expect(signUp({ name: 'Test User', email: 'test@example.com', password: 'wrong' }))
      .rejects
      .toThrow('Failed to sign up')
  })

  it('lancia un errore se fetch fallisce del tutto (es. rete assente)', async () => {
    // Arrange
    global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

    // Act & Assert
    await expect(signUp({ name: 'Test User', email: 'test@example.com', password: 'password' }))
      .rejects
      .toThrow('Network Error')
  })

})