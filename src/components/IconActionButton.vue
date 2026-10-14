<template>
  <n-tooltip :show-arrow="false" placement="top" trigger="hover">
    <template #trigger>
      <button
        v-bind="$attrs"
        type="button"
        :aria-label="label"
        :disabled="disabled"
        @click="$emit('click', $event)"
      >
        <AppIcon :name="icon" :size="iconSize" />
      </button>
    </template>
    {{ label }}
  </n-tooltip>
</template>

<script setup>
import { NTooltip } from 'naive-ui';
import AppIcon from './AppIcon.vue';

defineOptions({ inheritAttrs: false });

defineProps({
  label: { type: String, required: true },
  icon: { type: String, required: true },
  iconSize: { type: [Number, String], default: 16 },
  disabled: { type: Boolean, default: false }
});

defineEmits(['click']);
</script>
