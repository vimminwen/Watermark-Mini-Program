<template>
	<dark-page-meta />
	<view class="sub-page">
		<view class="about-content">
			<view class="logo-section">
				<image class="logo" src="/static/logo.png" mode="aspectFit"></image>
				<text class="app-name">图片工具箱</text>
				<text class="app-version">v1.0.0</text>
			</view>
			
			<view class="description-box boxBg">
				<text class="description-title">关于我们</text>
				<text class="description-text">
					图片工具箱是一款功能强大的图片处理工具集合，致力于为用户提供便捷、高效的图片编辑体验。

我们提供多种图片处理功能，包括格式转换、尺寸调整、去背景、滤镜效果等，满足您在工作和生活中的各种图片处理需求。

感谢您使用图片工具箱！
				</text>
			</view>
			
			<view class="features-box boxBg">
				<text class="features-title">功能特色</text>
				<view class="features-list">
					<view class="feature-item">
						<text class="feature-icon">🎨</text>
						<text class="feature-text">丰富的图片处理工具</text>
					</view>
					<view class="feature-item">
						<text class="feature-icon">⚡</text>
						<text class="feature-text">快速高效的处理速度</text>
					</view>
					<view class="feature-item">
						<text class="feature-icon">🔒</text>
						<text class="feature-text">隐私安全保护</text>
					</view>
					<view class="feature-item">
						<text class="feature-icon">📱</text>
						<text class="feature-text">多平台支持</text>
					</view>
				</view>
			</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
</script>

<style lang="scss">
	.sub-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, #050d40, #233968);
		padding: 30rpx;
		padding-bottom: 120rpx;
	}

	.about-content {
		display: flex;
		flex-direction: column;
		gap: 30rpx;
	}

	.logo-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 40rpx 0;
		
		.logo {
			width: 150rpx;
			height: 150rpx;
			margin-bottom: 20rpx;
		}
		
		.app-name {
			font-size: 36rpx;
			font-weight: bold;
			color: #ffffff;
			margin-bottom: 10rpx;
		}
		
		.app-version {
			font-size: 24rpx;
			color: rgba(255, 255, 255, 0.5);
		}
	}

	.description-box,
	.features-box {
		padding: 30rpx;
		border-radius: 16rpx;
		
		.description-title,
		.features-title {
			font-size: 32rpx;
			font-weight: bold;
			color: #ffffff;
			margin-bottom: 20rpx;
			display: block;
		}
	}

	.description-text {
		font-size: 26rpx;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.8;
		display: block;
	}

	.features-list {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.feature-item {
		display: flex;
		align-items: center;
		
		.feature-icon {
			font-size: 36rpx;
			margin-right: 20rpx;
		}
		
		.feature-text {
			font-size: 28rpx;
			color: rgba(255, 255, 255, 0.9);
		}
	}
</style>