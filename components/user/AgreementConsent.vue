<template>
	<view class="agreement-row" @tap="toggle">
		<view class="agreement-checkbox" :class="{ checked: modelValue }">
			<text v-if="modelValue" class="check-icon">✓</text>
		</view>
		<view class="agreement-label">
			<text class="label-text">我已阅读并同意</text>
			<text class="link-text" @tap.stop="emit('open-agreement')">《用户协议》</text>
			<text class="label-text">和</text>
			<text class="link-text" @tap.stop="emit('open-privacy')">《隐私政策》</text>
		</view>
	</view>
</template>

<script setup>
	const props = defineProps({
		modelValue: {
			type: Boolean,
			default: false
		}
	})

	const emit = defineEmits(['update:modelValue', 'open-agreement', 'open-privacy'])

	const toggle = () => {
		emit('update:modelValue', !props.modelValue)
	}
</script>

<style lang="scss" scoped>
	.agreement-row {
		display: flex;
		align-items: flex-start;
		gap: 16rpx;
		margin-bottom: 32rpx;
	}

	.agreement-checkbox {
		width: 32rpx;
		height: 32rpx;
		margin-top: 4rpx;
		border-radius: 8rpx;
		border: 2rpx solid rgba(255, 255, 255, 0.35);
		background: var(--surface-bg-light);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		box-sizing: border-box;

		&.checked {
			border-color: #4facfe;
			background: rgba(79, 172, 254, 0.25);
		}

		.check-icon {
			font-size: 22rpx;
			color: #4facfe;
			line-height: 1;
		}
	}

	.agreement-label {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		line-height: 1.6;
	}

	.label-text {
		font-size: 24rpx;
		color: var(--text-subtle);
	}

	.link-text {
		font-size: 24rpx;
		color: #4facfe;
	}
</style>
