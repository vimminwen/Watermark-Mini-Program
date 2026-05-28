<template>
	<view class="backend-required boxBg">
		<text class="status-icon">⚠️</text>
		<text class="status-title">{{ title }}</text>
		<text v-if="description" class="status-desc">{{ description }}</text>
		<view class="notice-box">
			<text class="notice-label">说明</text>
			<text class="notice-text">{{ message }}</text>
		</view>
		<view v-if="showBack" class="back-btn" @click="goBack">
			<text>返回上一页</text>
		</view>
	</view>
</template>

<script setup>
	defineProps({
		title: {
			type: String,
			default: '功能暂不可用'
		},
		description: {
			type: String,
			default: ''
		},
		message: {
			type: String,
			default:
				'该功能依赖服务端 AI 与算力，小程序端无法独立完成，请等待后续版本接入。'
		},
		showBack: {
			type: Boolean,
			default: true
		}
	})

	const goBack = () => {
		uni.navigateBack({
			fail: () => {
				uni.switchTab({ url: '/pages/index/index' })
			}
		})
	}
</script>

<style lang="scss" scoped>
	.backend-required {
		border-radius: 20rpx;
		padding: 48rpx 36rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.status-icon {
		font-size: 72rpx;
		margin-bottom: 20rpx;
	}

	.status-title {
		font-size: 34rpx;
		font-weight: bold;
		color: #ffffff;
		margin-bottom: 16rpx;
	}

	.status-desc {
		font-size: 26rpx;
		color: rgba(255, 255, 255, 0.65);
		line-height: 1.5;
		margin-bottom: 32rpx;
	}

	.notice-box {
		width: 100%;
		padding: 28rpx;
		border-radius: 16rpx;
		background: rgba(255, 180, 80, 0.1);
		border: 2rpx solid rgba(255, 180, 80, 0.35);
		box-sizing: border-box;
		margin-bottom: 36rpx;

		.notice-label {
			display: block;
			font-size: 24rpx;
			color: #ffc857;
			margin-bottom: 12rpx;
			font-weight: 600;
		}

		.notice-text {
			font-size: 26rpx;
			color: rgba(255, 255, 255, 0.75);
			line-height: 1.6;
			text-align: left;
		}
	}

	.back-btn {
		padding: 22rpx 64rpx;
		border-radius: 40rpx;
		background: rgba(79, 172, 254, 0.2);
		border: 2rpx solid rgba(79, 172, 254, 0.45);

		text {
			font-size: 28rpx;
			color: #4facfe;
		}

		&:active {
			opacity: 0.85;
		}
	}
</style>
