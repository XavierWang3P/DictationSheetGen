<template>
  <n-icon
    class="app-icon"
    :size="size"
    aria-hidden="true"
    focusable="false"
  >
    <component :is="iconComponent" />
  </n-icon>
</template>

<script setup>
import { computed } from 'vue';
import { NIcon } from 'naive-ui';
import AddOutline from '@vicons/ionicons5/es/AddOutline';
import BookOutline from '@vicons/ionicons5/es/BookOutline';
import BugOutline from '@vicons/ionicons5/es/BugOutline';
import CheckmarkOutline from '@vicons/ionicons5/es/CheckmarkOutline';
import ChevronDownOutline from '@vicons/ionicons5/es/ChevronDownOutline';
import ChevronUpOutline from '@vicons/ionicons5/es/ChevronUpOutline';
import CloseOutline from '@vicons/ionicons5/es/CloseOutline';
import CloudUploadOutline from '@vicons/ionicons5/es/CloudUploadOutline';
import CopyOutline from '@vicons/ionicons5/es/CopyOutline';
import CreateOutline from '@vicons/ionicons5/es/CreateOutline';
import DocumentTextOutline from '@vicons/ionicons5/es/DocumentTextOutline';
import DownloadOutline from '@vicons/ionicons5/es/DownloadOutline';
import EyeOutline from '@vicons/ionicons5/es/EyeOutline';
import HelpCircleOutline from '@vicons/ionicons5/es/HelpCircleOutline';
import MenuOutline from '@vicons/ionicons5/es/MenuOutline';
import RemoveOutline from '@vicons/ionicons5/es/RemoveOutline';
import PricetagOutline from '@vicons/ionicons5/es/PricetagOutline';
import PrintOutline from '@vicons/ionicons5/es/PrintOutline';
import RefreshOutline from '@vicons/ionicons5/es/RefreshOutline';
import SearchOutline from '@vicons/ionicons5/es/SearchOutline';
import SettingsOutline from '@vicons/ionicons5/es/SettingsOutline';
import TextOutline from '@vicons/ionicons5/es/TextOutline';
import TrashOutline from '@vicons/ionicons5/es/TrashOutline';

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [Number, String],
    default: 16
  }
});

const iconMap = Object.freeze({
  plus: AddOutline,
  book: BookOutline,
  search: SearchOutline,
  tag: PricetagOutline,
  download: DownloadOutline,
  upload: CloudUploadOutline,
  trash: TrashOutline,
  print: PrintOutline,
  settings: SettingsOutline,
  edit: CreateOutline,
  'file-text': DocumentTextOutline,
  refresh: RefreshOutline,
  check: CheckmarkOutline,
  x: CloseOutline,
  'arrow-up': ChevronUpOutline,
  'arrow-down': ChevronDownOutline,
  alphabet: TextOutline,
  eye: EyeOutline,
  copy: CopyOutline,
  bug: BugOutline,
  menu: MenuOutline,
  minus: RemoveOutline
});

const iconComponent = computed(() => iconMap[props.name] || HelpCircleOutline);
</script>

<style scoped>
.app-icon {
  display: inline-flex;
  vertical-align: -0.15em;
  flex-shrink: 0;
  color: inherit;
}
</style>
