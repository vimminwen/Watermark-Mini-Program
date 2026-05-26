<template>
	<dark-page-meta />
	<view class="sub-page">
		<view class="settings-list">
			<view class="settings-item boxBg">
				<view class="item-left">
					<text class="item-icon">🔔</text>
					<text class="item-text">消息通知</text>
				</view>
				<switch class="item-switch" :checked="notifications" @change="toggleNotifications" color="#4facfe" />
			</view>
			
			<view class="settings-item boxBg">
				<view class="item-left">
					<text class="item-icon">🌙</text>
					<text class="item-text">深色模式</text>
				</view>
				<switch class="item-switch" :checked="darkMode" @change="toggleDarkMode" color="#4facfe" />
			</view>
			
			<view class="settings-item boxBg">
				<view class="item-left">
					<text class="item-icon">💾</text>
					<text class="item-text">清除缓存</text>
				</view>
				<text class="item-arrow">></text>
			</view>
			
			<view class="settings-item boxBg">
				<view class="item-left">
					<text class="item-icon">🔄</text>
					<text class="item-text">检查更新</text>
				</view>
				<view class="item-right">
					<text class="version">v1.0.0</text>
					<text class="item-arrow">></text>
				</view>
			</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref } from 'vue'

	const notifications = ref(true)
	const darkMode = ref(false)

	const toggleNotifications = (e) => {
		notifications.value = e.detail.value
	}

	const toggleDarkMode = (e) => {
		darkMode.value = e.detail.value
	}
</script>

<style lang="scss">
	.sub-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, #050d40, #233968);
		padding: 30rpx;
	}

	.settings-list {
		display: flex;
		flex-direction: column;
		gap: 15rpx;
	}

	.settings-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 30rpx;
		border-radius: 16rpx;
		
		.item-left {
			display: flex;
			align-items: center;
			
			.item-icon {
				font-size: 40rpx;
				margin-right: 20rpx;
			}
			
			.item-text {
				font-size: 30rpx;
				color: #ffffff;
			}
		}
		
		.item-right {
			display: flex;
			align-items: center;
			
			.version {
				font-size: 26rpx;
				color: rgba(255, 255, 255, 0.5);
				margin-right: 10rpx;
			}
		}
		
		.item-arrow {
			font-size: 28rpx;
			color: rgba(255, 255, 255, 0.5);
		}
	}
</style>