import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfileUserPage from '../../components/ProfileUserPage/ProfileUserPage.jsx';
import { getProfile } from '../../components/services/profileUser.service.js';
import { profileUserUpdate } from '../../components/services/profileUserUpdate.service.js';
import { uploadAvatar } from '../../components/services/avatarUpload.service.js';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const dispatchMock = vi.fn();

vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux');
  return {
    ...actual,
    useDispatch: () => dispatchMock,
    useSelector: () => ({ accessToken: 'fake-token' }),
  };
});

vi.mock('../../components/services/profileUser.service.js', () => ({
  getProfile: vi.fn(),
}));

vi.mock('../../components/services/profileUserUpdate.service.js', () => ({
  profileUserUpdate: vi.fn(),
}));

vi.mock('../../components/services/avatarUpload.service.js', () => ({
  uploadAvatar: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ProfileUserPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:avatar'),
    });
  });

  it('renders the current profile avatar from the backend with a resolved URL', async () => {
    getProfile.mockResolvedValue({
      name: 'Mario',
      email: 'mario@example.com',
      status: 'active',
      avatar: 'uploads/avatar.jpg',
    });

    render(
      <MemoryRouter>
        <ProfileUserPage />
      </MemoryRouter>
    );

    const avatar = await screen.findByAltText(/avatar attuale/i);
    // L'URL ora punta a /uploads/ (non più /avatar/uploads/) e include
    // un cache-buster "?t=..." con timestamp, quindi verifichiamo il
    // prefisso/nome file invece di un match esatto.
    expect(avatar.getAttribute('src')).toMatch(
      /^http:\/\/127\.0\.0\.1:3001\/uploads\/avatar\.jpg\?t=\d+$/
    );
  });

  it('sends the selected avatar as FormData when updating the profile', async () => {
    getProfile.mockResolvedValue({
      name: 'Mario',
      email: 'mario@example.com',
      status: 'active',
      avatar: 'https://example.com/avatar.png',
    });

    profileUserUpdate.mockResolvedValue({ success: true });
    uploadAvatar.mockResolvedValue({ avatar: 'https://example.com/new-avatar.png' });

    render(
      <MemoryRouter>
        <ProfileUserPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Mario')).toBeInTheDocument();
    });

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const input = screen.getByLabelText(/immagine profilo/i);

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /aggiorna profilo/i }));

    await waitFor(() => {
      expect(profileUserUpdate).toHaveBeenCalledTimes(1);
      expect(uploadAvatar).toHaveBeenCalledTimes(1);
    });

    expect(uploadAvatar).toHaveBeenCalledWith('fake-token', file);
    expect(dispatchMock).toHaveBeenCalled();
  });
});
