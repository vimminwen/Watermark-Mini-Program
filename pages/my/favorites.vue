<template>
	<dark-page-meta />
	<view class="sub-page">
		<view class="empty-state">
			<view class="empty-icon">⭐</view>
			<text class="empty-title">暂无收藏</text>
			<text class="empty-desc">快去收藏你喜欢的工具吧</text>
			<view class="empty-btn" @click="goBack">
				<text>去看看</text>
			</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	const goBack = () => {
		uni.switchTab({
			url: '/pages/use/index'
		})
	}
</script>

<style lang="scss">
	.sub-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, #050d40, #233968);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 40rpx;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.empty-icon {
		font-size: 120rpx;
		margin-bottom: 30rpx;
	}

	.empty-title {
		font-size: 34rpx;
		font-weight: bold;
		color: #ffffff;
		margin-bottom: 15rpx;
	}

	.empty-desc {
		font-size: 26rpx;
		color: rgba(255, 255, 255, 0.6);
		margin-bottom: 40rpx;
	}

	.empty-btn {
		background: linear-gradient(to right, #4facfe, #00f2fe);
		padding: 20rpx 60rpx;
		border-radius: 40rpx;
		
		text {
			font-size: 28rpx;
			color: #ffffff;
			font-weight: 500;
		}
	}
</style>