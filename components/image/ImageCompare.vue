<template>
	<view
		class="image-compare"
		:class="{ 'is-dragging': isDragging }"
		:style="containerStyle"
		@touchstart="onTouchStart"
		@touchmove.stop.prevent="onTouchMove"
		@touchend="onTouchEnd"
		@touchcancel="onTouchEnd"
	>
		<!-- 处理后（底层，右侧可见） -->
		<image
			class="image-compare__image image-compare__after"
			:src="afterImage"
			:mode="imageMode"
			@load="onImageLoad"
		/>

		<!-- 处理前（上层裁剪，左侧可见） -->
		<view class="image-compare__before-wrap" :style="beforeWrapStyle">
			<image
				class="image-compare__image image-compare__before"
				:src="beforeImage"
				:mode="imageMode"
				:style="beforeImageStyle"
			/>
		</view>

		<!-- 分割线 -->
		<view class="image-compare__divider" :style="dividerStyle">
			<view class="image-compare__handle">
				<view class="image-compare__handle-line"></view>
				<view class="image-compare__handle-circle">
					<view class="image-compare__handle-arrow image-compare__handle-arrow--left"></view>
					<view class="image-compare__handle-arrow image-compare__handle-arrow--right"></view>
				</view>
				<view class="image-compare__handle-line"></view>
			</view>
		</view>

		<!-- 标签 -->
		<view v-if="showBeforeLabel" class="image-compare__label image-compare__label--before">处理前</view>
		<view v-if="showAfterLabel" class="image-compare__label image-compare__label--after">处理后</view>
	</view>
</template>

<script setup>
import { ref, computed, getCurrentInstance, onMounted } from 'vue'

const props = defineProps({
	beforeImage: {
		type: String,
		required: true
	},
	afterImage: {
		type: String,
		required: true
	},
	width: {
		type: String,
		default: '100%'
	},
	height: {
		type: String,
		default: '400rpx'
	},
	imageMode: {
		type: String,
		default: 'aspectFill'
	},
	showLabel: {
		type: Boolean,
		default: true
	},
	initialPosition: {
		type: Number,
		default: 50
	}
})

const instance = getCurrentInstance()
const sliderPosition = ref(props.initialPosition)
const containerWidth = ref(0)
const isDragging = ref(false)
const containerRect = ref(null)

const containerStyle = computed(() => ({
	width: props.width,
	height: props.height
}))

const beforeWrapStyle = computed(() => ({
	width: `${sliderPosition.value}%`
}))

const dividerStyle = computed(() => ({
	left: `${sliderPosition.value}%`
}))

const beforeImageStyle = computed(() => {
	if (!containerWidth.value) return {}
	return {
		width: `${containerWidth.value}px`
	}
})

const EDGE_THRESHOLD = 2
const SNAP_THRESHOLD = 10

const showBeforeLabel = computed(() => props.showLabel && sliderPosition.value > EDGE_THRESHOLD)
const showAfterLabel = computed(() => props.showLabel && sliderPosition.value < 100 - EDGE_THRESHOLD)

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const setPositionByClientX = (clientX) => {
	const rect = containerRect.value
	if (!rect || !rect.width) return
	const percent = ((clientX - rect.left) / rect.width) * 100
	sliderPosition.value = clamp(percent, 0, 100)
}

const snapToEdge = () => {
	const pos = sliderPosition.value
	if (pos <= SNAP_THRESHOLD) {
		sliderPosition.value = 0
	} else if (pos >= 100 - SNAP_THRESHOLD) {
		sliderPosition.value = 100
	}
}

const measureContainer = () => {
	const query = uni.createSelectorQuery().in(instance.proxy)
	query
		.select('.image-compare')
		.boundingClientRect((rect) => {
			if (rect && rect.width) {
				containerRect.value = rect
				containerWidth.value = rect.width
			}
		})
		.exec()
}

const onTouchStart = (e) => {
	isDragging.value = true
	const clientX = e.touches[0].clientX
	const query = uni.createSelectorQuery().in(instance.proxy)
	query
		.select('.image-compare')
		.boundingClientRect((rect) => {
			if (rect && rect.width) {
				containerRect.value = rect
				containerWidth.value = rect.width
				setPositionByClientX(clientX)
			}
		})
		.exec()
}

const onTouchMove = (e) => {
	if (!isDragging.value) return
	setPositionByClientX(e.touches[0].clientX)
}

const onTouchEnd = () => {
	isDragging.value = false
	snapToEdge()
}

const onImageLoad = () => {
	measureContainer()
}

onMounted(() => {
	sliderPosition.value = clamp(props.initialPosition, 0, 100)
	setTimeout(measureContainer, 50)
})
</script>

<style lang="scss" scoped>
.image-compare {
	position: relative;
	overflow: hidden;
	border-radius: 16rpx;
	user-select: none;
	touch-action: none;
	background: rgba(0, 0, 0, 0.2);

	&:not(.is-dragging) {
		.image-compare__before-wrap {
			transition: width 0.28s ease-out;
		}

		.image-compare__divider {
			transition: left 0.28s ease-out;
		}
	}

	&__image {
		display: block;
		width: 100%;
		height: 100%;
	}

	&__after {
		position: absolute;
		top: 0;
		left: 0;
	}

	&__before-wrap {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		overflow: hidden;
		z-index: 2;
	}

	&__before {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		max-width: none;
	}

	&__divider {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 4rpx;
		transform: translateX(-50%);
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	&__handle {
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
	}

	&__handle-line {
		flex: 1;
		width: 4rpx;
		background: #ffffff;
		box-shadow: 0 0 8rpx rgba(0, 0, 0, 0.4);
	}

	&__handle-circle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		background: #ffffff;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.3);
		flex-shrink: 0;
	}

	&__handle-arrow {
		width: 0;
		height: 0;
		border-top: 10rpx solid transparent;
		border-bottom: 10rpx solid transparent;

		&--left {
			border-right: 12rpx solid #333333;
			margin-right: 6rpx;
		}

		&--right {
			border-left: 12rpx solid #333333;
			margin-left: 6rpx;
		}
	}

	&__label {
		position: absolute;
		bottom: 16rpx;
		padding: 6rpx 16rpx;
		font-size: 22rpx;
		color: var(--text-primary);
		background: rgba(0, 0, 0, 0.5);
		border-radius: 8rpx;
		z-index: 4;
		pointer-events: none;

		&--before {
			left: 16rpx;
		}

		&--after {
			right: 16rpx;
		}
	}
}
</style>
