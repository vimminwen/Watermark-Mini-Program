<template>
	<dark-page-meta />
	<view class="sub-page" :class="themeClass">
		<view class="wechat-content">
			<view class="qr-section">
				<view class="qr-box">
					<image
						class="qr-code"
						src="/static/gzh.jpg"
						mode="aspectFit"
						show-menu-by-longpress
					/>
					<view class="qr-mask">
						<text class="mask-text">长按识别关注</text>
					</view>
				</view>
				<text class="qr-title">汇水印</text>
				<text class="qr-desc">关注公众号获取更多实用工具</text>
			</view>
			
			<view class="benefits-box boxBg">
				<text class="benefits-title">关注公众号享更多权益</text>
				<view class="benefits-list">
					<view class="benefit-item">
						<text class="benefit-icon"></text>
						<text class="benefit-text">专属福利活动</text>
					</view>
					<view class="benefit-item">
						<text class="benefit-icon">✨</text>
						<text class="benefit-text">新功能抢先体验</text>
					</view>
					<view class="benefit-item">
						<text class="benefit-icon"></text>
						<text class="benefit-text">使用技巧分享</text>
					</view>
				</view>
			</view>
			
			<view class="tips-box">
				<text class="tips-title"> 温馨提示</text>
				<text class="tips-content">长按上方二维码，选择「识别图中二维码」即可关注公众号；也可使用微信扫一扫扫描。</text>
			</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { usePageTheme } from '@/utils/theme/useTheme.js'

	const { themeClass } = usePageTheme()
</script>

<style lang="scss">
	.sub-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));
		padding: 40rpx 30rpx;
		padding-bottom: 120rpx;
	}

	.wechat-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 40rpx;
		padding: 0 20rpx;
	}

	.qr-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		
		.qr-box {
			position: relative;
			width: 320rpx;
			height: 320rpx;
			background: #ffffff;
			border-radius: 24rpx;
			padding: 24rpx;
			margin-bottom: 24rpx;
			
			.qr-code {
				width: 100%;
				height: 100%;
			}
			
			.qr-mask {
				position: absolute;
				bottom: 0;
				left: 0;
				right: 0;
				background: rgba(0, 0, 0, 0.6);
				padding: 20rpx;
				text-align: center;
				pointer-events: none;
				
				.mask-text {
					font-size: 26rpx;
					color: var(--text-primary);
				}
			}
		}
		
		.qr-title {
			font-size: 34rpx;
			font-weight: bold;
			color: var(--text-primary);
			margin-bottom: 12rpx;
		}
		
		.qr-desc {
			font-size: 26rpx;
			color: var(--text-subtle);
		}
	}

	.benefits-box {
		width: 100%;
		padding: 32rpx;
		border-radius: 16rpx;
		
		.benefits-title {
			font-size: 30rpx;
			font-weight: bold;
			color: var(--text-primary);
			display: block;
			margin-bottom: 24rpx;
			text-align: center;
		}
		
		.benefits-list {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: 24rpx;
		}
		
		.benefit-item {
			display: flex;
			align-items: center;
			
			.benefit-icon {
				font-size: 40rpx;
				margin-right: 16rpx;
			}
			
			.benefit-text {
				font-size: 28rpx;
				color: var(--text-dim);
			}
		}
	}

	.tips-box {
		width: 100%;
		background: rgba(79, 172, 254, 0.2);
		border: 1rpx solid rgba(79, 172, 254, 0.4);
		border-radius: 16rpx;
		padding: 28rpx;
		
		.tips-title {
			font-size: 28rpx;
			color: #4facfe;
			display: block;
			margin-bottom: 14rpx;
		}
		
		.tips-content {
			font-size: 26rpx;
			color: var(--text-soft);
			line-height: 1.7;
		}
	}
</style>