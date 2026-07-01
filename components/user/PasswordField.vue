<template>
	<view class="password-field">
		<input
			class="password-field__input"
			type="text"
			:password="!visible"
			:placeholder="placeholder"
			:value="modelValue"
			:maxlength="maxlength"
			autocomplete="off"
			@input="onInput"
		/>
		<view class="password-field__toggle" @tap.stop="toggleVisible">
			<text>{{ visible ? '隐藏' : '显示' }}</text>
		</view>
	</view>
</template>

<script>
	export default {
		options: {
			virtualHost: true
		}
	}
</script>

<script setup>
	import { ref } from 'vue'

	defineProps({
		modelValue: {
			type: String,
			default: ''
		},
		placeholder: {
			type: String,
			default: ''
		},
		maxlength: {
			type: [String, Number],
			default: 20
		}
	})

	const emit = defineEmits(['update:modelValue'])

	const visible = ref(false)

	const onInput = (e) => {
		emit('update:modelValue', e.detail?.value ?? '')
	}

	const toggleVisible = () => {
		visible.value = !visible.value
	}
</script>

<style lang="scss" scoped>
	.password-field {
		flex: 1;
		width: 100%;
		position: relative;
		min-width: 0;
		height: 44rpx;
	}

	.password-field__input {
		width: 100%;
		height: 100%;
		padding-right: 72rpx;
		box-sizing: border-box;
		font-size: 30rpx;
		color: var(--text-primary);
	}

	.password-field__toggle {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding-left: 12rpx;
		line-height: 1;

		text {
			font-size: 24rpx;
			color: #4facfe;
			white-space: nowrap;
		}

		&:active {
			opacity: 0.75;
		}
	}
</style>
