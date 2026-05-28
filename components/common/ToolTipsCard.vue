<template>
	<view class="tips-card boxBg">
		<view class="section-label">
			<view class="label-line" :class="{ 'line-pink': lineVariant === 'pink' }"></view>
			<text>{{ title }}</text>
		</view>
		<view class="tip-item" v-for="(tip, index) in tips" :key="index">
			<text class="tip-index">{{ index + 1 }}</text>
			<text class="tip-text">{{ tip }}</text>
		</view>
	</view>
</template>

<script setup>
	defineProps({
		title: {
			type: String,
			default: '使用说明'
		},
		tips: {
			type: Array,
			default: () => []
		},
		/** 标题装饰线：blue | pink */
		lineVariant: {
			type: String,
			default: 'blue'
		}
	})
</script>

<style lang="scss" scoped>
	.tips-card {
		border-radius: 20rpx;
		padding: 28rpx;
	}

	.section-label {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;

		.label-line {
			width: 8rpx;
			height: 32rpx;
			background: linear-gradient(to bottom, #4facfe, #00f2fe);
			border-radius: 4rpx;
			margin-right: 14rpx;

			&.line-pink {
				background: linear-gradient(to bottom, #fa709a, #fee140);
			}
		}

		text {
			font-size: 30rpx;
			font-weight: 600;
			color: #ffffff;
		}
	}

	.tip-item {
		display: flex;
		align-items: flex-start;
		margin-bottom: 20rpx;

		&:last-child {
			margin-bottom: 0;
		}

		.tip-index {
			width: 36rpx;
			height: 36rpx;
			line-height: 36rpx;
			text-align: center;
			font-size: 22rpx;
			color: #4facfe;
			background: rgba(79, 172, 254, 0.2);
			border-radius: 50%;
			margin-right: 16rpx;
			flex-shrink: 0;
		}

		.tip-text {
			flex: 1;
			font-size: 26rpx;
			color: rgba(255, 255, 255, 0.65);
			line-height: 1.5;
		}
	}
</style>
