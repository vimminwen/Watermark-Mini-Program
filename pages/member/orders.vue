<template>
	<dark-page-meta />
	<view class="orders-page">
		<view class="order-list">
			<view class="order-item boxBg" v-for="(order, index) in orders" :key="index">
				<view class="order-header">
					<text class="order-title">{{ order.title }}</text>
					<view class="order-status" :class="'status-' + order.status">
						{{ getStatusText(order.status) }}
					</view>
				</view>
				
				<view class="order-info">
					<view class="info-row">
						<text class="info-label">订单编号</text>
						<text class="info-value">{{ order.id }}</text>
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
				
				<view class="order-actions">
					<view class="action-btn" v-if="order.status === 'pending'">取消订单</view>
					<view class="action-btn primary" v-if="order.status === 'pending'">去支付</view>
					<view class="action-btn" v-if="order.status === 'success'">查看详情</view>
					<view class="action-btn" v-if="order.status === 'refunded'">查看详情</view>
				</view>
			</view>
			
			<view class="empty-state" v-if="orders.length === 0">
				<text class="empty-icon">📋</text>
				<text class="empty-text">暂无订单记录</text>
			</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref, computed } from 'vue'

	const activeTab = ref(0)

	const tabs = [
		{ name: '全部', count: 4 },
		{ name: '待支付', count: 1 },
		{ name: '已完成', count: 2 },
		{ name: '已退款', count: 1 }
	]

	const allOrders = [
		{
			id: 'ORD20250520001',
			title: '专业版季度会员',
			type: '会员充值',
			amount: '49.90',
			time: '2025-05-20 14:30:25',
			status: 'success'
		},
		{
			id: 'ORD20250415002',
			title: '专业版月度会员',
			type: '会员充值',
			amount: '19.90',
			time: '2025-04-15 09:12:33',
			status: 'success'
		},
		{
			id: 'ORD20250524003',
			title: '专业版年度会员',
			type: '会员充值',
			amount: '159.90',
			time: '2025-05-24 16:45:10',
			status: 'pending'
		},
		{
			id: 'ORD20250310004',
			title: '专业版月度会员',
			type: '会员退款',
			amount: '19.90',
			time: '2025-03-10 11:20:15',
			status: 'refunded'
		}
	]

	const orders = computed(() => {
		if (activeTab.value === 0) return allOrders
		if (activeTab.value === 1) return allOrders.filter(o => o.status === 'pending')
		if (activeTab.value === 2) return allOrders.filter(o => o.status === 'success')
		if (activeTab.value === 3) return allOrders.filter(o => o.status === 'refunded')
		return allOrders
	})

	const getStatusText = (status) => {
		const map = {
			pending: '待支付',
			success: '已完成',
			refunded: '已退款'
		}
		return map[status] || ''
	}
</script>

<style lang="scss">
	.orders-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, #050d40, #233968);
	}

	.tabs {
		display: flex;
		background: rgba(0, 0, 0, 0.3);
		padding: 10rpx;
		margin-bottom: 30rpx;

		.tab-item {
			flex: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 20rpx 10rpx;
			border-radius: 12rpx;
			position: relative;
			transition: all 0.3s ease;

			&.active {
				background: rgba(79, 172, 254, 0.2);
			}

			.tab-text {
				font-size: 28rpx;
				color: rgba(255, 255, 255, 0.7);

				&.active,
				.tab-item.active & {
					color: #ffffff;
					font-weight: bold;
				}
			}

			.tab-badge {
				position: absolute;
				top: 8rpx;
				right: calc(50% - 40rpx);
				background: #ff6b6b;
				font-size: 18rpx;
				color: #ffffff;
				padding: 2rpx 10rpx;
				border-radius: 20rpx;
				min-width: 28rpx;
				text-align: center;
			}
		}
	}

	.order-list {
		padding: 0 30rpx;
		padding-bottom: 100rpx;
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
				font-size: 30rpx;
				font-weight: bold;
				color: #ffffff;
			}

			.order-status {
				font-size: 24rpx;
				padding: 8rpx 20rpx;
				border-radius: 30rpx;

				&.status-pending {
					background: rgba(255, 180, 100, 0.2);
					color: #ffb464;
				}

				&.status-success {
					background: rgba(100, 200, 100, 0.2);
					color: #64c864;
				}

				&.status-refunded {
					background: rgba(255, 255, 255, 0.15);
					color: rgba(255, 255, 255, 0.6);
				}
			}
		}

		.order-info {
			display: flex;
			flex-direction: column;
			gap: 15rpx;
			margin-bottom: 25rpx;

			.info-row {
				display: flex;
				align-items: center;
				justify-content: space-between;

				.info-label {
					font-size: 26rpx;
					color: rgba(255, 255, 255, 0.6);
				}

				.info-value {
					font-size: 26rpx;
					color: rgba(255, 255, 255, 0.9);

					&.price {
						color: #ffd700;
						font-weight: bold;
						font-size: 32rpx;
					}
				}
			}
		}

		.order-actions {
			display: flex;
			gap: 15rpx;
			justify-content: flex-end;

			.action-btn {
				padding: 15rpx 35rpx;
				background: rgba(255, 255, 255, 0.1);
				border-radius: 30rpx;
				font-size: 24rpx;
				color: #ffffff;
				transition: all 0.3s ease;

				&.primary {
					background: linear-gradient(to right, #4facfe, #00f2fe);
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
		}
	}
</style>