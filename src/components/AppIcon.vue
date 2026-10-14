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
import { computed, h } from 'vue';
import { NIcon } from 'naive-ui';
import AddOutline from '@vicons/ionicons5/es/AddOutline';
import BookOutline from '@vicons/ionicons5/es/BookOutline';
import BugOutline from '@vicons/ionicons5/es/BugOutline';
import CheckmarkOutline from '@vicons/ionicons5/es/CheckmarkOutline';
import ChevronDownOutline from '@vicons/ionicons5/es/ChevronDownOutline';
import ChevronForwardOutline from '@vicons/ionicons5/es/ChevronForwardOutline';
import ChevronUpOutline from '@vicons/ionicons5/es/ChevronUpOutline';
import CloseOutline from '@vicons/ionicons5/es/CloseOutline';
import CloudUploadOutline from '@vicons/ionicons5/es/CloudUploadOutline';
import CopyOutline from '@vicons/ionicons5/es/CopyOutline';
import CreateOutline from '@vicons/ionicons5/es/CreateOutline';
import DocumentTextOutline from '@vicons/ionicons5/es/DocumentTextOutline';
import DownloadOutline from '@vicons/ionicons5/es/DownloadOutline';
import EyeOutline from '@vicons/ionicons5/es/EyeOutline';
import GlobeOutline from '@vicons/ionicons5/es/GlobeOutline';
import GridOutline from '@vicons/ionicons5/es/GridOutline';
import HelpCircleOutline from '@vicons/ionicons5/es/HelpCircleOutline';
import LogoGithub from '@vicons/ionicons5/es/LogoGithub';
import LogoWechat from '@vicons/ionicons5/es/LogoWechat';
import MenuOutline from '@vicons/ionicons5/es/MenuOutline';
import RemoveOutline from '@vicons/ionicons5/es/RemoveOutline';
import PricetagOutline from '@vicons/ionicons5/es/PricetagOutline';
import PrintOutline from '@vicons/ionicons5/es/PrintOutline';
import RefreshOutline from '@vicons/ionicons5/es/RefreshOutline';
import SearchOutline from '@vicons/ionicons5/es/SearchOutline';
import SettingsOutline from '@vicons/ionicons5/es/SettingsOutline';
import TextOutline from '@vicons/ionicons5/es/TextOutline';
import TrashOutline from '@vicons/ionicons5/es/TrashOutline';

const BilibiliIcon = {
  name: 'BilibiliIcon',
  render() {
    return h(
      'svg',
      {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: '1.8',
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      },
      [
        h('path', { d: 'M8.5 3.5L10.5 6.5' }),
        h('path', { d: 'M15.5 3.5L13.5 6.5' }),
        h('rect', { x: '3.5', y: '6.5', width: '17', height: '14', rx: '4', ry: '4' }),
        h('circle', { cx: '9', cy: '12', r: '1', fill: 'currentColor' }),
        h('circle', { cx: '15', cy: '12', r: '1', fill: 'currentColor' }),
        h('path', { d: 'M10.5 15.2C11.3 16 12.7 16 13.5 15.2' })
      ]
    );
  }
};

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
  'arrow-right': ChevronForwardOutline,
  'chevron-right': ChevronForwardOutline,
  alphabet: TextOutline,
  eye: EyeOutline,
  copy: CopyOutline,
  bug: BugOutline,
  menu: MenuOutline,
  minus: RemoveOutline,
  grid: GridOutline,
  github: LogoGithub,
  globe: GlobeOutline,
  wechat: LogoWechat,
  bilibili: BilibiliIcon
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
