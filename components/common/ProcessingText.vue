<template>
	<text v-if="showProcessing" class="processing-text">
		{{ text }}<text class="dot dot-1">·</text><text class="dot dot-2">·</text><text class="dot dot-3">·</text>
	</text>
	<text v-else>{{ idleText }}</text>
</template>

<script setup>
	import { computed } from 'vue'

	const props = defineProps({
		text: { type: String, required: true },
		/** 未传时始终显示带动画的处理文案 */
		active: { type: Boolean, default: undefined },
		idleText: { type: String, default: '' }
	})

	const showProcessing = computed(() =>
		props.active === undefined ? true : props.active
	)
</script>

<style scoped lang="scss">
	.processing-text {
		.dot {
			animation: processing-dot 1.4s infinite ease-in-out;
		}

		.dot-1 {
			animation-delay: 0s;
		}

		.dot-2 {
			animation-delay: 0.2s;
		}

		.dot-3 {
			animation-delay: 0.4s;
		}
	}

	@keyframes processing-dot {
		0%,
		20%,
		100% {
			opacity: 0.2;
		}

		50% {
			opacity: 1;
		}
	}
</style>
