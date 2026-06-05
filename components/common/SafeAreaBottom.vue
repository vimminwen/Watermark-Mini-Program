<template>
	<view class="safe-area-bottom" :class="themeClass" />
</template>

<script setup>
import { useTheme } from '@/utils/theme/useTheme.js'

const { themeClass } = useTheme()
</script>

<style lang="scss" scoped>
.safe-area-bottom {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	height: constant(safe-area-inset-bottom);
	height: env(safe-area-inset-bottom);
	background-color: var(--safe-area-bg, #233968);
	z-index: 9998;
	pointer-events: none;
}
</style>
