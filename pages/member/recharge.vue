<template>
	<dark-page-meta />
	<view class="recharge-page">
		<view class="header">
			<view class="title">会员充值</view>
			<view class="subtitle">选择适合您的会员套餐</view>
		</view>
		
		<view class="package-list">
			<view 
				class="package-item" 
				:class="{ active: selectedIndex === index }"
				v-for="(item, index) in packages" 
				:key="index"
				@click="selectPackage(index)"
			>
				<view class="package-header">
					<text class="package-name">{{ item.name }}</text>
					<view class="package-tag" v-if="item.hot">热门</view>
				</view>
				<view class="package-price">
					<text class="price-unit">¥</text>
					<text class="price-value">{{ item.price }}</text>
					<text class="price-unit">/{{ item.unit }}</text>
				</view>
				<view class="package-desc">{{ item.desc }}</view>
				<view class="package-benefits">
					<text v-for="(benefit, idx) in item.benefits" :key="idx" class="benefit-tag">
						✓ {{ benefit }}
					</text>
				</view>
			</view>
		</view>
		
		<view class="payment-section">
			<view class="payment-title">支付方式</view>
			<view class="payment-methods">
				<view 
					class="method-item" 
					:class="{ active: paymentMethod === 'wechat' }"
					@click="paymentMethod = 'wechat'"
				>
					<text class="method-icon">💬</text>
					<text class="method-name">微信支付</text>
					<view class="method-check" :class="{ active: paymentMethod === 'wechat' }"></view>
				</view>
	
			</view>
		</view>
		
		<view class="bottom-section">
			<view class="total-price">
				<text class="price-label">合计：</text>
				<text class="price-value">¥{{ packages[selectedIndex].price }}</text>
			</view>
			<view class="pay-button" @click="handlePay">立即支付</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref } from 'vue'

	const selectedIndex = ref(1)
	const paymentMethod = ref('wechat')

	const packages = [
		{
			name: '月度会员',
			price: '19.9',
			unit: '月',
			desc: '适合短期使用',
			hot: false,
			benefits: ['全部工具解锁', '无广告干扰', '云存储5GB']
		},
		{
			name: '季度会员',
			price: '49.9',
			unit: '季',
			desc: '性价比之选，立省10元',
			hot: true,
			benefits: ['全部工具解锁', '无广告干扰', '云存储20GB', '专属客服']
		}
	]

	const selectPackage = (index) => {
		selectedIndex.value = index
	}

	const handlePay = () => {
		uni.showToast({
			title: '支付功能开发中',
			icon: 'none'
		})
	}
</script>

<style lang="scss">
	.recharge-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, #050d40, #233968);
		padding: 30rpx;
		padding-bottom: 200rpx;
	}

	.header {
		text-align: center;
		padding: 40rpx 0;

		.title {
			font-size: 48rpx;
			font-weight: bold;
			color: #ffffff;
			margin-bottom: 15rpx;
		}

		.subtitle {
			font-size: 28rpx;
			color: rgba(255, 255, 255, 0.6);
		}
	}

	.package-list {
		display: flex;
		flex-direction: column;
		gap: 25rpx;
		margin-bottom: 50rpx;

		.package-item {
			background: rgba(255, 255, 255, 0.08);
			border: 2rpx solid rgba(255, 255, 255, 0.1);
			border-radius: 20rpx;
			padding: 35rpx;
			transition: all 0.3s ease;

			&.active {
				background: rgba(79, 172, 254, 0.15);
				border-color: #4facfe;
				box-shadow: 0 0 30rpx rgba(79, 172, 254, 0.3);
			}

			.package-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-bottom: 20rpx;

				.package-name {
					font-size: 36rpx;
					font-weight: bold;
					color: #ffffff;
				}

				.package-tag {
					background: linear-gradient(to right, #ff6b6b, #ffd93d);
					font-size: 20rpx;
					color: #ffffff;
					padding: 6rpx 18rpx;
					border-radius: 30rpx;
				}
			}

			.package-price {
				display: flex;
				align-items: baseline;
				margin-bottom: 20rpx;

				.price-unit {
					font-size: 28rpx;
					color: #ffd700;
				}

				.price-value {
					font-size: 56rpx;
					font-weight: bold;
					color: #ffd700;
					margin: 0 8rpx;
				}
			}

			.package-desc {
				font-size: 26rpx;
				color: rgba(255, 255, 255, 0.6);
				margin-bottom: 25rpx;
			}

			.package-benefits {
				display: flex;
				flex-wrap: wrap;
				gap: 15rpx;

				.benefit-tag {
					font-size: 22rpx;
					color: rgba(255, 255, 255, 0.8);
					background: rgba(255, 255, 255, 0.1);
					padding: 8rpx 20rpx;
					border-radius: 30rpx;
				}
			}
		}
	}

	.payment-section {
		background: rgba(255, 255, 255, 0.08);
		border-radius: 20rpx;
		padding: 30rpx;
		margin-bottom: 50rpx;

		.payment-title {
			font-size: 32rpx;
			font-weight: bold;
			color: #ffffff;
			margin-bottom: 25rpx;
		}

		.payment-methods {
			display: flex;
			flex-direction: column;
			gap: 20rpx;

			.method-item {
				display: flex;
				align-items: center;
				padding: 25rpx;
				background: rgba(255, 255, 255, 0.05);
				border-radius: 16rpx;
				border: 2rpx solid transparent;
				transition: all 0.3s ease;

				&.active {
					background: rgba(79, 172, 254, 0.1);
					border-color: #4facfe;
				}

				.method-icon {
					font-size: 40rpx;
					margin-right: 20rpx;
				}

				.method-name {
					flex: 1;
					font-size: 30rpx;
					color: #ffffff;
				}

				.method-check {
					width: 36rpx;
					height: 36rpx;
					border: 2rpx solid rgba(255, 255, 255, 0.3);
					border-radius: 50%;
					transition: all 0.3s ease;

					&.active {
						background: #4facfe;
						border-color: #4facfe;
						position: relative;

						&::after {
							content: '';
							position: absolute;
							left: 50%;
							top: 50%;
							transform: translate(-50%, -50%) rotate(45deg);
							width: 10rpx;
							height: 18rpx;
							border: 2rpx solid #ffffff;
							border-top: none;
							border-left: none;
						}
					}
				}
			}
		}
	}

	.bottom-section {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(5, 13, 64, 0.95);
		backdrop-filter: blur(20rpx);
		padding: 30rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;

		.total-price {
			.price-label {
				font-size: 28rpx;
				color: rgba(255, 255, 255, 0.7);
			}

			.price-value {
				font-size: 44rpx;
				font-weight: bold;
				color: #ffd700;
			}
		}

		.pay-button {
			background: linear-gradient(to right, #4facfe, #00f2fe);
			padding: 25rpx 60rpx;
			border-radius: 50rpx;
			font-size: 32rpx;
			font-weight: bold;
			color: #ffffff;
			box-shadow: 0 8rpx 30rpx rgba(79, 172, 254, 0.4);
		}
	}
</style>