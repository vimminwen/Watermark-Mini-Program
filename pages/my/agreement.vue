<template>
	<dark-page-meta />
	<view class="sub-page" :class="themeClass">
		<scroll-view scroll-y class="scroll-content">
			<view class="content-box">
				<view class="section">
					<text class="section-title">一、协议的接受</text>
					<text class="section-content">欢迎使用汇水印（以下简称"本应用"）。本应用由我们开发和运营。</text>
					<text class="section-content">您下载、安装、使用本应用即表示您同意接受本协议的全部条款和条件。如果您不同意本协议，请不要使用本应用。</text>
				</view>
				
				<view class="section">
					<text class="section-title">二、服务内容</text>
					<text class="section-content">本应用提供图片处理相关的工具和服务，包括但不限于：</text>
					<view class="section-list">
						<text class="list-item">- 图片格式转换</text>
						<text class="list-item">- 图片尺寸调整</text>
						<text class="list-item">- 图片去背景</text>
						<text class="list-item">- 图片滤镜效果</text>
						<text class="list-item">- 其他图片处理功能</text>
					</view>
				</view>
				
				<view class="section">
					<text class="section-title">三、用户权利与义务</text>
					<view class="section-list">
						<text class="list-item">1. 用户有权使用本应用提供的服务。</text>
						<text class="list-item">2. 用户应遵守本协议的所有条款。</text>
						<text class="list-item">3. 用户不得利用本应用从事违法违规活动。</text>
						<text class="list-item">4. 用户应对其使用本应用的行为负责。</text>
					</view>
				</view>
				
				<view class="section">
					<text class="section-title">四、隐私保护</text>
					<text class="section-content">我们重视用户隐私保护。请查阅本应用的隐私政策了解详细信息。</text>
				</view>
				
				<view class="section">
					<text class="section-title">五、协议变更</text>
					<text class="section-content">我们有权随时修改本协议。修改后的协议将在本应用内公布。继续使用本应用即表示您同意接受修改后的协议。</text>
				</view>
				
				<view class="section">
					<text class="section-title">六、免责声明</text>
					<text class="section-content">本应用提供的服务仅供参考，我们不对服务的准确性、完整性或适用性做出任何保证。用户使用本应用产生的任何后果由用户自行承担。</text>
				</view>
				
				<text class="footer">最后更新：2026年1月1日</text>
			</view>
		</scroll-view>
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
		width: 100%;
		box-sizing: border-box;
	}

	.scroll-content {
		height: 100vh;
		padding: 20rpx;
		width: 100%;
		box-sizing: border-box;
	}

	.content-box {
		background: rgba(0, 0, 0, 0.4);
		border-radius: 16rpx;
		padding: 20rpx;
		width: 100%;
		box-sizing: border-box;
	}

	.title {
		font-size: 32rpx;
		font-weight: bold;
		color: var(--text-primary);
		display: block;
		text-align: center;
		margin-bottom: 10rpx;
	}

	.subtitle {
		font-size: 24rpx;
		color: var(--text-subtle);
		display: block;
		text-align: center;
		margin-bottom: 20rpx;
		border-bottom: 1rpx solid var(--border-color);
		padding-bottom: 20rpx;
	}

	.section {
		margin-bottom: 25rpx;
		
		.section-title {
			font-size: 26rpx;
			font-weight: bold;
			color: var(--text-primary);
			display: block;
			margin-bottom: 12rpx;
		}
		
		.section-content {
			font-size: 24rpx;
			color: var(--text-soft);
			line-height: 1.6;
			display: block;
			margin-bottom: 12rpx;
		}
		
		.section-list {
			padding-left: 20rpx;
			
			.list-item {
				font-size: 24rpx;
				color: var(--text-soft);
				line-height: 1.6;
				display: block;
				margin-bottom: 8rpx;
			}
		}
	}

	.footer {
		font-size: 22rpx;
		color: var(--text-faint);
		display: block;
		text-align: center;
		margin-top: 30rpx;
		padding-top: 20rpx;
		border-top: 1rpx solid var(--border-color);
	}
</style>