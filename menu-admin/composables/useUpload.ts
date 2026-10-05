import { useAuthStore } from '~/stores/auth';

// Загрузка фото и видео в menu-api: POST /admin/upload, тело — сам файл. Ответ — { url: '/media/…' }.
// Лимиты — как на сервере: картинка до 8 МБ (JPG, PNG, WebP, GIF), видео до 25 МБ (MP4, WebM, MOV).
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export function useUpload() {
  const uploading = ref(false);

  async function upload(file: File): Promise<string> {
    const isImage = IMAGE_TYPES.includes(file.type);
    const isVideo = VIDEO_TYPES.includes(file.type);
    if (!isImage && !isVideo) throw new Error('Нужна картинка JPG, PNG, WebP или GIF либо видео MP4/WebM');
    const maxMb = isVideo ? 25 : 8;
    if (file.size > maxMb * 1024 * 1024) {
      throw new Error(`${isVideo ? 'Видео' : 'Картинка'} больше ${maxMb} МБ (${(file.size / 1024 / 1024).toFixed(1)} МБ) — уменьшите файл`);
    }
    uploading.value = true;
    try {
      const { apiBase } = useRuntimeConfig().public;
      const res = await $fetch<{ url: string }>('/admin/upload', {
        baseURL: apiBase,
        method: 'POST',
        body: file,
        headers: { 'Content-Type': file.type, Authorization: `Bearer ${useAuthStore().token}` },
      });
      return res.url;
    } finally {
      uploading.value = false;
    }
  }

  return { upload, uploading };
}
