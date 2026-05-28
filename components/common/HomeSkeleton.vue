<template>
	<view class="home-skeleton">
		<!-- 轮播占位 -->
		<view class="sk-banner sk-shimmer"></view>

		<!-- 快捷工具 -->
		<view class="sk-section">
			<view class="sk-title-row">
				<view class="sk-line sk-shimmer"></view>
				<view class="sk-title sk-shimmer"></view>
			</view>
			<view class="sk-quick-grid">
				<view
					v-for="n in 6"
					:key="'q' + n"
					class="sk-quick-card sk-shimmer"
					:style="{ animationDelay: n * 0.08 + 's' }"
				>
					<view class="sk-icon"></view>
					<view class="sk-text-short"></view>
				</view>
			</view>
		</view>

		<!-- 更多工具列表 -->
		<view class="sk-section">
			<view class="sk-title-row">
				<view class="sk-line sk-line-pink sk-shimmer"></view>
				<view class="sk-title sk-shimmer"></view>
				<view class="sk-count sk-shimmer"></view>
			</view>
			<view
				v-for="n in 5"
				:key="'l' + n"
				class="sk-list-item sk-shimmer"
				:style="{ animationDelay: n * 0.1 + 's' }"
			>
				<view class="sk-list-icon"></view>
				<view class="sk-list-body">
					<view class="sk-text-long"></view>
					<view class="sk-text-mid"></view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
</script>

<style lang="scss" scoped>
	.home-skeleton {
		padding-bottom: 40rpx;
	}

	.sk-shimmer {
		background: rgba(255, 255, 255, 0.08);
		animation: sk-pulse 1.4s ease-in-out infinite;
	}

	@keyframes sk-pulse {
		0%,
		100% {
			opacity: 0.45;
		}

		50% {
			opacity: 0.9;
		}
	}

	.sk-banner {
		height: 320rpx;
		margin: 0 20rpx 30rpx;
		border-radius: 20rpx;
	}

	.sk-section {
		padding: 0 30rpx;
		margin-bottom: 40rpx;
	}

	.sk-title-row {
		display: flex;
		align-items: center;
		margin-bottom: 25rpx;
	}

	.sk-line {
		width: 8rpx;
		height: 35rpx;
		border-radius: 4rpx;
		margin-right: 15rpx;
		flex-shrink: 0;

		&.sk-line-pink {
			opacity: 0.7;
		}
	}

	.sk-title {
		width: 160rpx;
		height: 32rpx;
		border-radius: 8rpx;
	}

	.sk-count {
		width: 80rpx;
		height: 26rpx;
		border-radius: 8rpx;
		margin-left: 12rpx;
	}

	.sk-quick-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20rpx;
	}

	.sk-quick-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 30rpx 15rpx;
		border-radius: 16rpx;

		.sk-icon {
			width: 60rpx;
			height: 60rpx;
			border-radius: 12rpx;
			background: rgba(255, 255, 255, 0.06);
			margin-bottom: 15rpx;
		}

		.sk-text-short {
			width: 80rpx;
			height: 24rpx;
			border-radius: 6rpx;
			background: rgba(255, 255, 255, 0.06);
		}
	}

	.sk-list-item {
		display: flex;
		align-items: center;
		padding: 25rpx;
		border-radius: 16rpx;
		margin-bottom: 20rpx;

		&:last-child {
			margin-bottom: 0;
		}

		.sk-list-icon {
			width: 70rpx;
			height: 70rpx;
			border-radius: 14rpx;
			background: rgba(255, 255, 255, 0.06);
			margin-right: 20rpx;
			flex-shrink: 0;
		}

		.sk-list-body {
			flex: 1;

			.sk-text-long {
				width: 55%;
				height: 30rpx;
				border-radius: 8rpx;
				background: rgba(255, 255, 255, 0.06);
				margin-bottom: 14rpx;
			}

			.sk-text-mid {
				width: 90%;
				height: 24rpx;
				border-radius: 6rpx;
				background: rgba(255, 255, 255, 0.05);
			}
		}
	}
</style>
