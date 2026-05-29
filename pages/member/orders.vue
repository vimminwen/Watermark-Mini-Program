<template>
	<dark-page-meta />
	<view class="orders-page">
		<view style="height: 30rpx;"></view>

		<view class="order-list">
			<view class="loading-state" v-if="loading">
				<text class="loading-text">加载中…</text>
			</view>

			<view
				class="order-item boxBg"
				v-for="(order, index) in orders"
				:key="order.id || index"
				v-show="!loading"
			>
				<view class="order-header">
					<text class="order-title">{{ order.title }}</text>
					<view class="order-status status-success">
						{{ order.orderStatusText || '支付成功' }}
					</view>
				</view>

				<view class="order-info">
					<view class="info-row">
						<text class="info-label">订单编号</text>
						<text class="info-value">{{ order.id || '--' }}</text>
					</view>
					<view class="info-row">
						<text class="info-label">订单类型</text>
						<text class="info-value">{{ order.type }}</text>
					</view>
					<view class="info-row">
						<text class="info-label">支付金额</text>
						<text class="info-value price">¥{{ order.amount }}</text>
					</view>
					<view class="info-row">
						<text class="info-label">下单时间</text>
						<text class="info-value">{{ order.time }}</text>
					</view>
				</view>
			</view>

			<view class="empty-state" v-if="!loading && orders.length === 0">
				<text class="empty-icon">📋</text>
				<text class="empty-text">{{ emptyText }}</text>
				<view class="empty-btn" v-if="!isLoggedIn" @click="goLogin">去登录</view>
			</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref, computed } from 'vue'
	import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
	import { apiGetPayHistory } from '@/api/api.js'
	import { hasValidToken } from '@/utils/request.js'
	import { parsePayHistoryList } from '@/utils/pay/payHistory.js'

	const loading = ref(false)
	const isLoggedIn = ref(false)
	const orders = ref([])

	const emptyText = computed(() => {
		if (!isLoggedIn.value) return '登录后查看支付订单'
		return '暂无支付成功记录'
	})

	const isPaidOrder = (order) => {
		if (order.status === 'success') return true
		return /支付成功|已支付|已完成/i.test(String(order.orderStatusText || ''))
	}

	const goLogin = () => {
		uni.navigateTo({ url: '/pages/user/login' })
	}

	const loadOrders = async () => {
		const userId = uni.getStorageSync('userIdStorage')
		if (!hasValidToken() || !userId) {
			isLoggedIn.value = false
			orders.value = []
			return
		}

		isLoggedIn.value = true
		loading.value = true
		try {
			const res = await apiGetPayHistory(userId)
			const list = parsePayHistoryList(res)
			orders.value = list
				.filter(isPaidOrder)
				.sort((a, b) => String(b.time).localeCompare(String(a.time)))
		} catch (err) {
			console.warn('[loadOrders]', err)
			orders.value = []
			uni.showToast({
				title: '订单加载失败',
				icon: 'none'
			})
		} finally {
			loading.value = false
			uni.stopPullDownRefresh()
		}
	}

	onShow(() => {
		loadOrders()
	})

	onPullDownRefresh(() => {
		loadOrders()
	})
</script>

<style lang="scss">
	.orders-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, #050d40, #233968);
	}

	.order-list {
		padding: 0 30rpx;
		padding-bottom: 100rpx;
	}

	.loading-state {
		padding: 80rpx 0;
		text-align: center;

		.loading-text {
			font-size: 28rpx;
			color: rgba(255, 255, 255, 0.6);
		}
	}

	.order-item {
		padding: 30rpx;
		margin-bottom: 25rpx;

		.order-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: 25rpx;
			padding-bottom: 20rpx;
			border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);

			.order-title {
				flex: 1;
				font-size: 30rpx;
				font-weight: bold;
				color: #ffffff;
				margin-right: 16rpx;
			}

			.order-status {
				flex-shrink: 0;
				font-size: 24rpx;
				padding: 8rpx 20rpx;
				border-radius: 30rpx;

				&.status-success {
					background: rgba(100, 200, 100, 0.2);
					color: #64c864;
				}
			}
		}

		.order-info {
			display: flex;
			flex-direction: column;
			gap: 15rpx;

			.info-row {
				display: flex;
				align-items: center;
				justify-content: space-between;

				.info-label {
					font-size: 26rpx;
					color: rgba(255, 255, 255, 0.6);
					flex-shrink: 0;
					margin-right: 20rpx;
				}

				.info-value {
					font-size: 26rpx;
					color: rgba(255, 255, 255, 0.9);
					text-align: right;
					word-break: break-all;

					&.price {
						color: #ffd700;
						font-weight: bold;
						font-size: 32rpx;
					}
				}
			}
		}
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 150rpx 0;

		.empty-icon {
			font-size: 100rpx;
			margin-bottom: 30rpx;
		}

		.empty-text {
			font-size: 28rpx;
			color: rgba(255, 255, 255, 0.5);
			margin-bottom: 30rpx;
		}

		.empty-btn {
			padding: 18rpx 48rpx;
			background: linear-gradient(to right, #4facfe, #00f2fe);
			border-radius: 40rpx;
			font-size: 28rpx;
			color: #ffffff;
		}
	}
</style>
