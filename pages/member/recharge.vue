<template>
	<dark-page-meta />
	<view class="recharge-page">
		<view class="header">
			<view class="subtitle">选择适合您的会员套餐</view>
		</view>

		<view class="loading-wrap" v-if="loading">
			<text class="loading-text">套餐加载中…</text>
		</view>

		<view class="package-list" v-else-if="packages.length">
			<view
				class="package-item"
				:class="{ active: selectedIndex === index }"
				v-for="(item, index) in packages"
				:key="item.id"
				@click="selectPackage(index)"
			>
				<view class="package-header">
					<text class="package-name">{{ item.name }}</text>
					<view class="package-tag" v-if="item.badgeText">{{ item.badgeText }}</view>
				</view>
				<view class="package-price">
					<text class="price-unit">¥</text>
					<text class="price-value">{{ item.price }}</text>
					<text class="price-unit">/{{ item.unit }}</text>
					<text class="price-original" v-if="item.originalPrice">¥{{ item.originalPrice }}</text>
				</view>
				<view class="package-desc" v-if="item.desc">{{ item.desc }}</view>
				<view class="package-benefits">
					<text v-for="(benefit, idx) in item.benefits" :key="idx" class="benefit-tag">
						✓ {{ benefit }}
					</text>
				</view>
			</view>
		</view>

		<view class="empty-wrap" v-else>
			<text class="empty-text">暂无可用套餐</text>
			<view class="empty-btn" @click="loadPackages">重新加载</view>
		</view>

		<view class="payment-section" v-if="packages.length">
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

		<view class="bottom-section" v-if="selectedPackage">
			<view class="total-price">
				<text class="price-label">合计：</text>
				<text class="price-value">¥{{ selectedPackage.price }}</text>
			</view>
			<PayButton :member-data="selectedMemberData" @pay-success="onPaySuccess">
				<view class="pay-button">立即支付</view>
			</PayButton>
		</view>
	</view>
</template>

<script setup>
	import { ref, computed } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import PayButton from '@/components/PayButton.vue'
	import { apiGetMemberPrice } from '@/api/api.js'
	import { parseMemberPackageList } from '@/utils/pay/memberPackage.js'

	const selectedIndex = ref(0)
	const paymentMethod = ref('wechat')
	const loading = ref(true)
	const packages = ref([])
	const routeOptions = ref({})
	/** 从待支付订单进入时携带的原订单信息 */
	const pendingOrder = ref(null)

	const selectedPackage = computed(() => packages.value[selectedIndex.value] || null)

	const orderMatchesPackage = (order, pkg) => {
		if (!order || !pkg) return false
		const title = String(order.title || '').trim()
		const amount = String(order.amount ?? '').trim()
		if (title && (pkg.name === title || title.includes(pkg.name) || pkg.name.includes(title))) {
			return true
		}
		if (amount && (String(pkg.price) === amount || Number(pkg.price) === Number(amount))) {
			return true
		}
		return false
	}

	const selectedMemberData = computed(() => {
		const item = selectedPackage.value
		if (!item) return {}
		const data = {
			id: item.id,
			title: item.name,
			money: item.price,
			vipType: item.vipType
		}
		if (pendingOrder.value && orderMatchesPackage(pendingOrder.value, item)) {
			data.reusePendingOrder = true
			data.orderNo = pendingOrder.value.orderNo
			data.orderId = pendingOrder.value.orderId
			if (pendingOrder.value.vipType) {
				data.vipType = pendingOrder.value.vipType
			}
		}
		return data
	})

	const selectPackage = (index) => {
		selectedIndex.value = index
		const pkg = packages.value[index]
		if (pendingOrder.value && !orderMatchesPackage(pendingOrder.value, pkg)) {
			pendingOrder.value = null
		}
	}

	/** 根据订单/路由参数匹配套餐索引 */
	const resolvePackageIndex = (options = {}, list = packages.value) => {
		if (!list.length) return 0

		const packageName = decodeURIComponent(options.package || options.name || '').trim()
		const amount = String(options.amount ?? '').trim()
		const vipType = String(options.vipType ?? '').trim().toLowerCase()

		if (packageName) {
			const exact = list.findIndex(p => p.name === packageName)
			if (exact >= 0) return exact

			const fuzzy = list.findIndex(
				p => packageName.includes(p.name) || p.name.includes(packageName)
			)
			if (fuzzy >= 0) return fuzzy
		}

		if (amount) {
			const byAmount = list.findIndex(
				p => String(p.price) === amount || Number(p.price) === Number(amount)
			)
			if (byAmount >= 0) return byAmount
		}

		if (vipType) {
			const byType = list.findIndex(
				p => String(p.vipType).toLowerCase() === vipType || String(p.code).toLowerCase() === vipType
			)
			if (byType >= 0) return byType
			if (vipType === 'quarter') {
				const seasonIdx = list.findIndex(p => p.vipType === 'season' || p.code === 'season')
				if (seasonIdx >= 0) return seasonIdx
			}
		}

		const badgeIdx = list.findIndex(p => p.badgeText)
		return badgeIdx >= 0 ? badgeIdx : 0
	}

	const applyRouteOptions = (options = {}) => {
		selectedIndex.value = resolvePackageIndex(options, packages.value)

		const orderNo = decodeURIComponent(options.orderNo || '').trim()
		const orderId = String(options.orderId || '').trim()
		if (orderNo || orderId) {
			pendingOrder.value = {
				orderNo,
				orderId,
				title: decodeURIComponent(options.package || '').trim(),
				amount: String(options.amount ?? '').trim(),
				vipType: String(options.vipType ?? '').trim()
			}
		}
	}

	const loadPackages = async () => {
		loading.value = true
		try {
			const res = await apiGetMemberPrice()
			packages.value = parseMemberPackageList(res)
			applyRouteOptions(routeOptions.value)
		} catch (err) {
			console.warn('[loadPackages]', err)
			packages.value = []
			uni.showToast({ title: '套餐加载失败', icon: 'none' })
		} finally {
			loading.value = false
		}
	}

	onLoad((options) => {
		routeOptions.value = options || {}
		loadPackages()
	})

	const onPaySuccess = () => {
		setTimeout(() => {
			uni.navigateBack({
				fail: () => uni.switchTab({ url: '/pages/my/index' })
			})
		}, 1200)
	}
</script>

<style lang="scss">
	.recharge-page {
		min-height: 100vh;
		box-sizing: border-box;
		background: linear-gradient(to bottom, #050d40, #233968);
		padding: 30rpx;
		padding-bottom: calc(200rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(200rpx + env(safe-area-inset-bottom));
	}

	.header {
		text-align: center;
		padding: 40rpx 0;

		.subtitle {
			font-size: 28rpx;
			color: rgba(255, 255, 255, 0.6);
		}
	}

	.loading-wrap,
	.empty-wrap {
		padding: 120rpx 0;
		display: flex;
		flex-direction: column;
		align-items: center;

		.loading-text,
		.empty-text {
			font-size: 28rpx;
			color: rgba(255, 255, 255, 0.6);
			margin-bottom: 24rpx;
		}

		.empty-btn {
			padding: 18rpx 48rpx;
			background: linear-gradient(to right, #4facfe, #00f2fe);
			border-radius: 40rpx;
			font-size: 28rpx;
			color: #ffffff;
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

				.price-original {
					margin-left: 16rpx;
					font-size: 26rpx;
					color: rgba(255, 255, 255, 0.45);
					text-decoration: line-through;
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
		z-index: 100;
		box-sizing: border-box;
		background: rgba(5, 13, 64, 0.95);
		backdrop-filter: blur(20rpx);
		padding: 30rpx;
		padding-bottom: calc(30rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
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
