<template>
	<dark-page-meta />
	<view class="recharge-page" :class="themeClass">
		<view class="header">
			<view class="subtitle">选择适合您的会员套餐</view>
		</view>

		<view class="loading-wrap" v-if="loading">
			<text class="loading-text">套餐加载中…</text>
		</view>

		<view class="package-list" v-else-if="packages.length">
			<view
				class="package-item"
				:class="{
					active: selectedIndex === index,
					disabled: isUnavailableMemberPackage(item)
				}"
				v-for="(item, index) in packages"
				:key="item.id"
				@click="selectPackage(index)"
			>
				<view class="package-header">
					<text class="package-name">{{ item.name }}</text>
					<view class="package-tag" v-if="getPackageBadgeText(item)">{{ getPackageBadgeText(item) }}</view>
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

		<view class="bottom-section" v-if="selectedPackage">
			<view class="total-price">
				<text class="price-label">合计：</text>
				<text class="price-value">¥{{ selectedPackage.price }}</text>
			</view>
			<PayButton
				v-if="isLoggedIn"
				:member-data="selectedMemberData"
				@pay-success="onPaySuccess"
			>
				<view class="pay-button">立即支付</view>
			</PayButton>
			<view v-else class="pay-button" @click="promptLogin">立即支付</view>
		</view>
	</view>
</template>

<script setup>
	import { usePageTheme } from '@/utils/theme/useTheme.js'

	const { themeClass } = usePageTheme()
	import { ref, computed } from 'vue'
	import { onLoad, onShow } from '@dcloudio/uni-app'
	import PayButton from '@/components/PayButton.vue'
	import { apiGetMemberPrice } from '@/api/api.js'
	import { hasValidToken } from '@/utils/request.js'
	import {
		parseMemberPackageList,
		isUnavailableMemberPackage,
		getPackageBadgeText
	} from '@/utils/pay/memberPackage.js'

	const selectedIndex = ref(0)
	const loading = ref(true)
	const packages = ref([])
	const routeOptions = ref({})
	const isLoggedIn = ref(false)
	/** 从待支付订单进入时携带的原订单信息 */
	const pendingOrder = ref(null)

	const refreshLoginState = () => {
		isLoggedIn.value = hasValidToken()
	}

	const promptLogin = () => {
		uni.showModal({
			title: '提示',
			content: '请先登录',
			confirmText: '确定',
			cancelText: '取消',
			success: (res) => {
				if (res.confirm) {
					uni.navigateTo({ url: '/pages/user/login' })
				}
			}
		})
	}

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
		const pkg = packages.value[index]
		if (isUnavailableMemberPackage(pkg)) {
			uni.showModal({
				title: '提示',
				content: '暂未开通',
				showCancel: false,
				confirmText: '知道了'
			})
			return
		}
		selectedIndex.value = index
		if (pendingOrder.value && !orderMatchesPackage(pendingOrder.value, pkg)) {
			pendingOrder.value = null
		}
	}

	const resolveFirstAvailableIndex = (list = packages.value) => {
		const idx = list.findIndex((item) => !isUnavailableMemberPackage(item))
		return idx >= 0 ? idx : 0
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

		if (isUnavailableMemberPackage(packages.value[selectedIndex.value])) {
			selectedIndex.value = resolveFirstAvailableIndex(packages.value)
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
		refreshLoginState()
		loadPackages()
	})

	onShow(() => {
		refreshLoginState()
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
		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));
		padding: 30rpx;
		padding-bottom: calc(200rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(200rpx + env(safe-area-inset-bottom));
	}

	.header {
		text-align: center;
		padding: 40rpx 0;

		.subtitle {
			font-size: 28rpx;
			color: var(--text-subtle);
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
			color: var(--text-subtle);
			margin-bottom: 24rpx;
		}

		.empty-btn {
			padding: 18rpx 48rpx;
			background: linear-gradient(to right, #4facfe, #00f2fe);
			border-radius: 40rpx;
			font-size: 28rpx;
			color: var(--text-primary);
		}
	}

	.package-list {
		display: flex;
		flex-direction: column;
		gap: 25rpx;
		margin-bottom: 30rpx;

		.package-item {
			background: var(--surface-bg);
			border: 2rpx solid var(--border-color);
			border-radius: 20rpx;
			padding: 35rpx;
			transition: all 0.3s ease;

			&.active {
				background: rgba(79, 172, 254, 0.15);
				border-color: #4facfe;
				box-shadow: 0 0 30rpx rgba(79, 172, 254, 0.3);
			}

			&.disabled {
				opacity: 0.72;
			}

			.package-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-bottom: 20rpx;

				.package-name {
					font-size: 36rpx;
					font-weight: bold;
					color: var(--text-primary);
				}

				.package-tag {
					background: linear-gradient(to right, #ff6b6b, #ffd93d);
					font-size: 20rpx;
					color: var(--text-primary);
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
					color: var(--text-muted);
					text-decoration: line-through;
				}
			}

			.package-desc {
				font-size: 26rpx;
				color: var(--text-subtle);
				margin-bottom: 25rpx;
			}

			.package-benefits {
				display: flex;
				flex-wrap: wrap;
				gap: 15rpx;

				.benefit-tag {
					font-size: 22rpx;
					color: var(--text-soft);
					background: var(--surface-bg);
					padding: 8rpx 20rpx;
					border-radius: 30rpx;
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
				color: var(--text-secondary);
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
			color: var(--text-primary);
			box-shadow: 0 8rpx 30rpx rgba(79, 172, 254, 0.4);
		}
	}
</style>
