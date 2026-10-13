<template>
  <div class="grid-wrap" :style="{ height: `${heightMm}mm` }">
    <svg
      class="four-line-svg"
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <template v-if="styleType === 'four-line'">
        <!-- 第 1 线 (顶线) -->
        <line x1="0" y1="0.5" x2="100" y2="0.5" :stroke="color" :stroke-width="stroke" vector-effect="non-scaling-stroke" />
        <!-- 第 2 线 (中上线) -->
        <line x1="0" y1="29.5" x2="100" y2="29.5" :stroke="color" :stroke-width="stroke * 0.85" stroke-dasharray="2.5, 2.5" vector-effect="non-scaling-stroke" />
        <!-- 第 3 线 (基准实线，适当加粗加深) -->
        <line x1="0" y1="70.5" x2="100" y2="70.5" :stroke="color" :stroke-width="stroke * 1.3" vector-effect="non-scaling-stroke" />
        <!-- 第 4 线 (底线) -->
        <line x1="0" y1="99.5" x2="100" y2="99.5" :stroke="color" :stroke-width="stroke" vector-effect="non-scaling-stroke" />

        <!-- 左右闭合竖线 -->
        <template v-if="showVertical">
          <line x1="0" y1="0" x2="0" y2="100" :stroke="color" :stroke-width="stroke * 0.8" vector-effect="non-scaling-stroke" />
          <line x1="100" y1="0" x2="100" y2="100" :stroke="color" :stroke-width="stroke * 0.8" vector-effect="non-scaling-stroke" />
        </template>
      </template>

      <template v-else>
        <!-- 普通单横线 -->
        <line x1="0" y1="82" x2="100" y2="82" :stroke="color" :stroke-width="stroke * 1.3" vector-effect="non-scaling-stroke" />
      </template>
    </svg>
  </div>
</template>

<script setup>
defineProps({
  heightMm: {
    type: Number,
    default: 12
  },
  stroke: {
    type: Number,
    default: 0.85
  },
  color: {
    type: String,
    default: '#cbd5e1'
  },
  styleType: {
    type: String,
    default: 'four-line'
  },
  showVertical: {
    type: Boolean,
    default: true
  }
});
</script>

<style scoped>
.grid-wrap {
  width: 100%;
  display: flex;
  align-items: stretch;
}
.four-line-svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
