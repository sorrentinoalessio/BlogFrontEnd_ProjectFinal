import { describe, it, expect, vi, beforeEach } from 'vitest';
import { editPost } from '../../components/services/editPost.service.js';

describe('editPost', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends multipart form-data when editing a post with an uploaded image', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: async () => ({ success: true }),
    });

    const formData = new FormData();
    formData.append('title', 'post con immagine');
    formData.append('description', 'descrizione con immagine');
    formData.append('tag', JSON.stringify(['cinema']));
    formData.append(
      'uploadedFile',
      new File(['image-bytes'], 'test.jpg', { type: 'image/jpeg' })
    );

    await editPost('123', formData, 'fake-token');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe('PATCH');
    expect(options.headers).toEqual({
      Authorization: 'Bearer fake-token',
    });
    expect(options.body).toBe(formData);
  });
});
