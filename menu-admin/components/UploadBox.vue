<script setup lang="ts">
// Рамка «перетащите файл или нажмите» — по образцу MediaUploader из админки Мудрого Пекаря
const props = withDefaults(defineProps<{ accept?: 'image' | 'video'; hint?: string; compact?: boolean }>(), {
  accept: 'image',
  hint: '',
  compact: false,
});
const emit = defineEmits<{ uploaded: [url: string, file: File] }>();

const notify = useNotify();
const { upload, uploading } = useUpload();
const dragging = ref(false);
const input = ref<HTMLInputElement | null>(null);

const acceptAttr = computed(() => (props.accept === 'image' ? IMAGE_TYPES : [...VIDEO_TYPES, 'image/gif', 'image/webp']).join(','));
const defaultHint = computed(() =>
  props.accept === 'image' ? 'JPG, PNG, WebP или GIF до 8 МБ' : 'MP4 3–6 секунд без звука, до 25 МБ (или анимированный WebP/GIF)',
);

async function handle(files: FileList | null | undefined) {
  const file = files?.[0];
  if (!file) return;
  try {
    emit('uploaded', await upload(file), file);
  } catch (e) {
    notify.error(e, `Не удалось загрузить ${file.name}`);
  }
  if (input.value) input.value.value = '';
}

const onDrop = (e: DragEvent) => {
  dragging.value = false;
  handle(e.dataTransfer?.files);
};
</script>

<template>
  <div
    class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition"
    :class="[
      dragging ? 'border-cta-500 bg-cta-50' : 'border-slate-300 hover:border-cta-400',
      compact ? 'gap-1 px-3 py-4' : 'gap-2 px-6 py-8',
    ]"
    role="button"
    tabindex="0"
    @click="!uploading && input?.click()"
    @keydown.enter="!uploading && input?.click()"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input ref="input" type="file" class="hidden" :accept="acceptAttr" @change="handle(($event.target as HTMLInputElement).files)" />
    <template v-if="uploading">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-cta-500" />
      <div class="text-sm">Загружаем…</div>
    </template>
    <template v-else>
      <UIcon name="i-heroicons-cloud-arrow-up" class="h-6 w-6 text-slate-400" />
      <div class="text-sm font-medium">Перетащите файл сюда или нажмите</div>
      <div class="text-xs text-slate-500">{{ hint || defaultHint }}</div>
    </template>
  </div>
</template>
