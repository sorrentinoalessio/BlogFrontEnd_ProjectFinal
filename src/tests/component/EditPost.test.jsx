import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditPost from '../../components/Posts/EditPost/EditPost.jsx';
import { getPost } from '../../components/services/post.service.js';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: 'post-1' }),
  };
});

vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux');
  return {
    ...actual,
    useSelector: () => ({ accessToken: 'fake-token' }),
  };
});

vi.mock('../../components/services/post.service.js', () => ({
  getPost: vi.fn(),
}));

vi.mock('../../components/services/editPost.service.js', () => ({
  editPost: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('EditPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefills the title with the existing post matching the route id', async () => {
    getPost.mockResolvedValue({
      _id: 'post-1',
      title: 'Titolo esistente',
      description: 'Descrizione esistente',
      status: 'draft',
      tag: ['primo'],
    });

    render(
      <MemoryRouter>
        <EditPost />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Titolo esistente')).toBeInTheDocument();
    });
  });
});
