<template>
	<dark-page-meta />
	<view class="sub-page">
		<scroll-view scroll-y class="scroll-content">
			<view class="content-box">
				<view class="section">
					<text class="section-title">一、信息收集</text>
					<text class="section-content">我们可能收集以下信息：</text>
					<view class="section-list">
						<text class="list-item">- 您主动提供的信息，如反馈内容等</text>
						<text class="list-item">- 使用信息，如您使用的功能、使用时间等</text>
						<text class="list-item">- 设备信息，如设备型号、操作系统等</text>
					</view>
				</view>
				
				<view class="section">
					<text class="section-title">二、信息使用</text>
					<text class="section-content">我们收集的信息将用于：</text>
					<view class="section-list">
						<text class="list-item">- 提供和改进本应用的服务</text>
						<text class="list-item">- 了解用户需求和使用习惯</text>
						<text class="list-item">- 保障应用安全</text>
						<text class="list-item">- 遵守法律法规</text>
					</view>
				</view>
				
				<view class="section">
					<text class="section-title">三、信息保护</text>
					<text class="section-content">我们采取多种安全措施保护您的信息：</text>
					<view class="section-list">
						<text class="list-item">- 数据加密存储</text>
						<text class="list-item">- 访问权限控制</text>
						<text class="list-item">- 定期安全审计</text>
						<text class="list-item">- 不向第三方泄露您的个人信息</text>
					</view>
				</view>
				
				<view class="section">
					<text class="section-title">四、信息共享</text>
					<text class="section-content">我们不会向任何第三方出售、出租或分享您的个人信息，除非：</text>
					<view class="section-list">
						<text class="list-item">- 获得您的明确同意</text>
						<text class="list-item">- 遵守法律法规要求</text>
						<text class="list-item">- 保护我们的合法权益</text>
					</view>
				</view>
				
				<view class="section">
					<text class="section-title">五、您的权利</text>
					<text class="section-content">您有权：</text>
					<view class="section-list">
						<text class="list-item">- 访问您的个人信息</text>
						<text class="list-item">- 更正您的个人信息</text>
						<text class="list-item">- 删除您的个人信息</text>
						<text class="list-item">- 拒绝信息收集（可能影响部分功能使用）</text>
					</view>
				</view>
				
				<view class="section">
					<text class="section-title">六、政策变更</text>
					<text class="section-content">我们可能随时更新本政策。更新后的政策将在本应用内公布。继续使用本应用即表示您同意接受更新后的政策。</text>
				</view>
				
				<text class="footer">最后更新：2024年1月1日</text>
			</view>
		</scroll-view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
</script>

<style lang="scss">
	.sub-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, #050d40, #233968);
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
		color: #ffffff;
		display: block;
		text-align: center;
		margin-bottom: 10rpx;
	}

	.subtitle {
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.6);
		display: block;
		text-align: center;
		margin-bottom: 20rpx;
		border-bottom: 1rpx solid rgba(255, 255, 255, 0.2);
		padding-bottom: 20rpx;
	}

	.section {
		margin-bottom: 25rpx;
		
		.section-title {
			font-size: 26rpx;
			font-weight: bold;
			color: #ffffff;
			display: block;
			margin-bottom: 12rpx;
		}
		
		.section-content {
			font-size: 24rpx;
			color: rgba(255, 255, 255, 0.8);
			line-height: 1.6;
			display: block;
			margin-bottom: 12rpx;
		}
		
		.section-list {
			padding-left: 20rpx;
			
			.list-item {
				font-size: 24rpx;
				color: rgba(255, 255, 255, 0.8);
				line-height: 1.6;
				display: block;
				margin-bottom: 8rpx;
			}
		}
	}

	.footer {
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.4);
		display: block;
		text-align: center;
		margin-top: 30rpx;
		padding-top: 20rpx;
		border-top: 1rpx solid rgba(255, 255, 255, 0.1);
	}
</style>