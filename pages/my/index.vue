<template>
	<dark-page-meta />
	<view class="my-page" :class="themeClass">
		<view class="user-section" @click="goToUserCenter">
			<view class="user-info">
				<image class="avatar" :src="displayAvatar" mode="aspectFit" @error="onAvatarError"></image>
				<view class="user-text">
					<text class="username">{{ isLoggedIn ? userProfile.nickname : '点击登录' }}</text>
					<!-- <text v-if="showUserLevel" class="user-level">{{ userProfile.level }}</text> -->
				</view>
			</view>
		</view>

		<view class="member-section boxBg">
			<view class="member-header" :class="{ 'member-header--tap': showMemberOpenCta }"
				@click="handleMemberHeaderClick">
				<view class="member-badge" :class="{ inactive: !isVipActive }">
					<text class="badge-icon">{{ isVipActive ? '👑' : '✨' }}</text>
					<view class="badge-level">{{ memberBadgeLabel }}</view>
				</view>
				<view class="member-info">
					<text class="member-title">{{ memberTitle }}</text>
					<view class="member-detail">
						<text class="member-expire">{{ memberExpireText }}</text>
						<view class="member-open-cta" v-if="showMemberOpenCta">
							<text class="open-vip-btn">去开通</text>
							<text class="iconfont icon-xiangyou open-vip-arrow"></text>
						</view>
						<view class="member-progress" v-else-if="showMemberProgress && isVipActive">
							<view class="progress-bar" v-if="showVipProgressBar">
								<view class="progress-fill" :style="{ width: memberUsedPercent + '%' }"></view>
							</view>
							<text class="progress-text">{{ memberProgressText }}</text>
						</view>
						<view class="member-progress" v-else-if="showMemberProgress && !isLoggedIn">
							<text class="progress-text">登录查看</text>
						</view>
					</view>
				</view>
			</view>

			<view class="member-benefits">
				<view class="benefit-item">
					<text class="benefit-icon">🎨</text>
					<text class="benefit-text">全部工具解锁</text>
				</view>
				<view class="benefit-divider"></view>
				<view class="benefit-item">
					<text class="benefit-icon">⚡</text>
					<text class="benefit-text">极速处理</text>
				</view>
				<view class="benefit-divider"></view>
				<view class="benefit-item">
					<text class="benefit-icon">☁️</text>
					<text class="benefit-text">云端存储</text>
				</view>
			</view>

			<view class="member-actions">
				<view class="action-card" @click="goToRecharge">
					<view class="action-icon-wrap action-recharge">
						<text class="action-icon">💳</text>
					</view>
					<text class="action-text">会员充值</text>
				</view>
				<view class="action-card" @click="goToCancel">
					<view class="action-icon-wrap action-cancel">
						<text class="action-icon">❌</text>
					</view>
					<text class="action-text">会员退订</text>
				</view>
				<view class="action-card" @click="goToOrders">
					<view class="action-icon-wrap action-orders">
						<text class="action-icon">🧾</text>
					</view>
					<text class="action-text">支付订单</text>
				</view>
			</view>
		</view>

		<view class="menu-container" v-for="category in menuCategories" :key="category.id">
			<view class="menu-title">
				<view class="title-line" :class="category.id === '1' ? 'line-blue' : 'line-pink'"></view>
				<text class="title-text">{{ category.title }}</text>
			</view>

			<view class="menu-list">
				<view class="menu-item boxBg" v-for="item in category.children" :key="item.id"
					v-show="item.show === '1'" @click="handleMenuClick(item)">
					<view class="menu-left">
						<text class="menu-icon">{{ item.icon }}</text>
						<text class="menu-text">{{ item.title }}</text>
					</view>
					<text class="iconfont icon-xiangyou"></text>
				</view>
			</view>
		</view>

		<view class="icp-footer" @click="copyIcpNumber">
			<text class="icp-text">{{ icpNumber }}</text>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import {
		usePageTheme
	} from '@/utils/theme/useTheme.js'

	const {
		themeClass
	} = usePageTheme()
	import {
		computed,
		ref
	} from 'vue'
	import {
		onShow
	} from '@dcloudio/uni-app'
	import myMenu from '@/api/data/myMenu.json'
	import {
		apiGetUserInfo
	} from '@/api/api.js'
	import {
		hasValidToken
	} from '@/utils/request.js'
	import {
		useVipInfo,
		getMembershipUsedPercent,
		formatVipPlanName
	} from '@/utils/user/useVipInfo.js'

	const defaultProfile = {
		avatar: '/static/logo.png',
		nickname: '汇水印用户',
		level: '普通用户'
	}

	const LOGO = '/static/logo.png'

	const resolveAvatar = (avatar) => {
		const value = typeof avatar === 'string' ? avatar.trim() : ''
		if (!value || value === 'null' || value === 'undefined') return LOGO
		if (/^https?:\/\//i.test(value)) return value
		if (value.startsWith('/static/')) return value
		return LOGO
	}

	const isLoggedIn = ref(false)
	const avatarErrored = ref(false)
	const userProfile = ref({
		...defaultProfile
	})

	const {
		userVipInfo,
		getVipInfo
	} = useVipInfo()

	const isVipActive = computed(() => userVipInfo.value.ifVip)

	const memberBadgeLabel = computed(() => {
		const detail = userVipInfo.value.vipDetail
		if (!isVipActive.value || !detail) return '开通'
		const name = detail.planName || formatVipPlanName(detail)
		if (!name) return 'VIP'
		if (name.length <= 4) return name
		if (name.includes('季度')) return '季度'
		if (name.includes('月度') || name.includes('包月')) return '月度'
		if (name.includes('年度') || name.includes('年')) return '年度'
		return 'VIP'
	})

	const memberTitle = computed(() => {
		if (!isLoggedIn.value) return '会员中心'
		if (!isVipActive.value) return '开通会员'
		const detail = userVipInfo.value.vipDetail
		return detail?.planName || formatVipPlanName(detail) || '尊贵会员'
	})

	const memberExpireText = computed(() => {
		if (!isLoggedIn.value) return '登录后查看会员状态'
		if (!isVipActive.value) return '开通会员解锁全部工具与权益'
		const detail = userVipInfo.value.vipDetail
		if (detail?.expireDate) return `有效期至 ${detail.expireDate}`
		return '会员有效期加载中…'
	})

	const memberUsedPercent = computed(() => {
		if (!isVipActive.value) return 0
		return getMembershipUsedPercent(userVipInfo.value.vipDetail)
	})

	const showVipProgressBar = computed(() => {
		const detail = userVipInfo.value.vipDetail
		return isVipActive.value && !!detail?.expireDate
	})

	const memberProgressText = computed(() => {
		if (!isLoggedIn.value) return '登录查看'
		if (!isVipActive.value) return '去开通'
		const detail = userVipInfo.value.vipDetail
		const remain = detail?.formatTime && detail.formatTime !== '已过期' ? detail.formatTime : ''
		if (remain) return `剩余 ${remain} · 已用 ${memberUsedPercent.value}%`
		if (detail?.remainingDays > 0) return `剩余 ${detail.remainingDays}天 · 已用 ${memberUsedPercent.value}%`
		return `已用 ${memberUsedPercent.value}%`
	})

	const showMemberProgress = computed(() => isLoggedIn.value)

	/** 已登录且非会员：展示「去开通」并可点击跳转充值 */
	const showMemberOpenCta = computed(() => isLoggedIn.value && !isVipActive.value)

	const displayAvatar = computed(() => {
		if (avatarErrored.value || !isLoggedIn.value) return LOGO
		return resolveAvatar(userProfile.value.avatar)
	})

	const onAvatarError = () => {
		avatarErrored.value = true
	}

	const showUserLevel = computed(() => {
		if (!isLoggedIn.value) return false
		const level = userProfile.value.level
		return !!level && level !== '普通用户'
	})

	const menuCategories = computed(() => {
		return myMenu
			.filter(category => category.show === '1')
			.sort((a, b) => parseInt(a.sort) - parseInt(b.sort))
			.map(category => ({
				...category,
				children: category.children
					.filter(child => child.show === '1')
					.sort((a, b) => parseInt(a.sort) - parseInt(b.sort))
			}))
	})

	const pickUserFromBody = (body) => {
		if (!body || typeof body !== 'object') return null
		const data = body.data
		if (data && typeof data === 'object' && !Array.isArray(data)) {
			if (data.id != null || data.userId != null || data.phone != null || data.nickname != null) {
				return data
			}
		}
		if (body.id != null || body.userId != null || body.phone != null || body.nickname != null) {
			return body
		}
		return null
	}

	const applyUserProfile = (user) => {
		userProfile.value = {
			avatar: resolveAvatar(user.image ?? user.avatar),
			nickname: user.nickname || '汇水印用户',
			level: user.level ?? user.vipType ?? user.type ?? '普通用户'
		}
	}

	const loadUserProfile = async () => {
		avatarErrored.value = false
		const userId = uni.getStorageSync('userIdStorage')
		if (!hasValidToken() || !userId) {
			isLoggedIn.value = false
			userProfile.value = {
				...defaultProfile
			}
			userVipInfo.value = {
				ifVip: false,
				vipDetail: null
			}
			return
		}

		isLoggedIn.value = true

		const stored = uni.getStorageSync('userInfo')
		if (stored && typeof stored === 'object') {
			userProfile.value = {
				avatar: resolveAvatar(stored.avatar),
				nickname: stored.nickname || '汇水印用户',
				level: stored.level || '普通用户'
			}
		}

		try {
			const res = await apiGetUserInfo(userId)
			const user = pickUserFromBody(res?.data)
			if (!user) return

			applyUserProfile(user)
			const prev = uni.getStorageSync('userInfo') || {}
			uni.setStorageSync('userInfo', {
				...prev,
				id: String(user.id ?? user.userId ?? userId),
				phone: user.phone ?? prev.phone ?? '',
				nickname: userProfile.value.nickname,
				avatar: userProfile.value.avatar,
				level: userProfile.value.level
			})
			uni.setStorageSync('userInfoStorage', user)
		} catch (err) {
			console.warn('[loadUserProfile]', err)
		}
	}

	const loadMemberInfo = async () => {
		if (!hasValidToken() || !uni.getStorageSync('userIdStorage')) {
			userVipInfo.value = {
				ifVip: false,
				vipDetail: null
			}
			return
		}
		try {
			await getVipInfo()
			const detail = userVipInfo.value.vipDetail
			if (isVipActive.value && detail) {
				const level = detail.planName || detail.model || detail.typeLabel
				if (level) {
					userProfile.value = {
						...userProfile.value,
						level: String(level)
					}
				}
			} else if (isLoggedIn.value) {
				userProfile.value = {
					...userProfile.value,
					level: '普通用户'
				}
			}
		} catch (err) {
			console.warn('[loadMemberInfo]', err)
		}
	}

	onShow(() => {
		loadUserProfile()
		loadMemberInfo()
	})

	const handleMenuClick = (item) => {
		if (item.action === 'goToTools') {
			uni.switchTab({
				url: '/pages/use/index'
			})
		} else if (item.url) {
			uni.navigateTo({
				url: item.url
			})
		}
	}

	const goToRecharge = () => {
		uni.navigateTo({
			url: '/pages/member/recharge'
		})
	}

	const handleMemberHeaderClick = () => {
		if (isVipActive.value) return
		if (!isLoggedIn.value) {
			goToUserCenter()
			return
		}
		goToRecharge()
	}

	const goToCancel = () => {
		uni.showModal({
			title: '提示',
			content: '退订后立即生效，本月服务仍可正常使用，下月起停止扣费。',
			cancelColor: '#b9b9b9',
			confirmColor: '#07b85b',
			success: (res) => {
				if (!res.confirm) return
				uni.showModal({
					title: '退订成功',
					content: '操作即生效，下月将不再自动续费。',
					showCancel: false
				})
			}
		})
	}

	const goToOrders = () => {
		uni.navigateTo({
			url: '/pages/member/orders'
		})
	}

	const goToUserCenter = () => {
		if (isLoggedIn.value) {
			uni.navigateTo({
				url: '/pages/user/userCenter'
			})
			return
		}
		uni.navigateTo({
			url: '/pages/user/login'
		})
	}

	const icpNumber = '粤ICP备2026063110号-2X'

	const copyIcpNumber = () => {
		uni.setClipboardData({
			data: icpNumber,
			success: () => {
				uni.showModal({
					content: '复制成功',
					showCancel: false,
					confirmText: '知道了'
				})
			},
			fail: () => {
				uni.showToast({ title: '复制失败', icon: 'none' })
			}
		})
	}
</script>

<style lang="scss">
	.my-page {
		min-height: 100vh;
		padding: 0 30rpx 120rpx;
		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));
	}

	.user-section {
		padding: 40rpx 0;

		.user-info {
			display: flex;
			align-items: center;

			.avatar {
				width: 120rpx;
				height: 120rpx;
				border-radius: 60rpx;
				margin-right: 25rpx;
				background: var(--surface-bg);
			}

			.user-text {
				display: flex;
				flex-direction: column;

				.username {
					font-size: 34rpx;
					font-weight: bold;
					color: var(--text-primary);
					margin-bottom: 10rpx;
				}

				.user-level {
					font-size: 26rpx;
					color: var(--text-secondary);
					background: var(--surface-bg);
					padding: 5rpx 20rpx;
					border-radius: 20rpx;
					display: inline-block;
				}
			}
		}
	}

	.member-section {
		padding: 30rpx;
		border-radius: 20rpx;
		margin-bottom: 30rpx;
		background: linear-gradient(135deg, var(--surface-bg) 0%, var(--surface-bg-light) 100%);
		backdrop-filter: blur(20rpx);

		.member-header {
			display: flex;
			align-items: center;
			padding-bottom: 25rpx;
			border-bottom: 1rpx solid var(--border-color);
			margin-bottom: 25rpx;

			&--tap:active {
				opacity: 0.88;
			}

			.member-badge {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				width: 100rpx;
				height: 100rpx;
				background: linear-gradient(135deg, #ffd700, #ffb800);
				border-radius: 50%;
				margin-right: 25rpx;
				box-shadow: 0 8rpx 32rpx rgba(255, 215, 0, 0.3);

				&.inactive {
					background: linear-gradient(135deg, var(--surface-bg-strong), var(--surface-bg));
					box-shadow: none;

					.badge-level {
						color: var(--text-soft);
					}
				}

				.badge-icon {
					font-size: 40rpx;
				}

				.badge-level {
					font-size: 18rpx;
					font-weight: bold;
					color: #8b4513;
					margin-top: 2rpx;
				}
			}

			.member-info {
				flex: 1;
				display: flex;
				flex-direction: column;

				.member-title {
					font-size: 34rpx;
					font-weight: bold;
					color: var(--text-primary);
					margin-bottom: 10rpx;
				}

				.member-detail {
					display: flex;
					flex-direction: column;

					.member-expire {
						font-size: 24rpx;
						color: var(--text-secondary);
						margin-bottom: 8rpx;
					}

					.member-open-cta {
						display: flex;
						align-items: center;
						justify-content: space-between;
						margin-top: 8rpx;
						padding: 14rpx 20rpx;
						background: rgba(79, 172, 254, 0.15);
						border-radius: 12rpx;
						border: 1rpx solid rgba(79, 172, 254, 0.35);

						.open-vip-btn {
							font-size: 26rpx;
							font-weight: bold;
							color: #4facfe;
						}

						.open-vip-arrow {
							font-size: 24rpx;
							color: #4facfe;
						}
					}

					.member-progress {
						display: flex;
						align-items: center;
						gap: 15rpx;

						.progress-bar {
							flex: 1;
							height: 8rpx;
							background: var(--surface-bg-strong);
							border-radius: 4rpx;
							overflow: hidden;

							.progress-fill {
								height: 100%;
								background: linear-gradient(90deg, #4facfe, #00f2fe);
								border-radius: 4rpx;
								transition: width 0.5s ease;
							}
						}

						.progress-text {
							font-size: 22rpx;
							color: var(--text-subtle);
							min-width: 100rpx;
							text-align: right;
						}
					}
				}
			}

			.member-arrow {
				width: 40rpx;
				height: 40rpx;
				display: flex;
				align-items: center;
				justify-content: center;
				background: var(--surface-bg);
				border-radius: 50%;

				.icon-xiangyou {
					font-size: 32rpx;
					color: var(--text-subtle);
				}
			}
		}

		.member-benefits {
			display: flex;
			align-items: center;
			justify-content: space-around;
			padding: 25rpx 0;
			border-bottom: 1rpx solid var(--border-color);
			margin-bottom: 25rpx;

			.benefit-item {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 8rpx;

				.benefit-icon {
					font-size: 36rpx;
				}

				.benefit-text {
					font-size: 22rpx;
					color: var(--text-soft);
				}
			}

			.benefit-divider {
				width: 1rpx;
				height: 50rpx;
				background: var(--surface-bg);
			}
		}

		.member-actions {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 16rpx;
		}

		.action-card {
			display: flex;
			flex-direction: column;
			align-items: center;
			padding: 20rpx 10rpx;
			background: var(--surface-bg-light);
			border-radius: 16rpx;
			transition: all 0.3s ease;

			&:active {
				transform: scale(0.95);
				background: var(--surface-bg);
			}

			.action-icon-wrap {
				width: 60rpx;
				height: 60rpx;
				display: flex;
				align-items: center;
				justify-content: center;
				border-radius: 14rpx;
				margin-bottom: 12rpx;

				&.action-recharge {
					background: linear-gradient(135deg, rgba(79, 172, 254, 0.3), rgba(0, 242, 254, 0.3));
				}

				&.action-cancel {
					background: linear-gradient(135deg, rgba(255, 100, 100, 0.3), rgba(255, 50, 50, 0.3));
				}

				&.action-orders {
					background: linear-gradient(135deg, rgba(255, 180, 100, 0.3), rgba(255, 150, 50, 0.3));
				}
			}

			.action-icon {
				font-size: 28rpx;
			}

			.action-text {
				font-size: 22rpx;
				color: var(--text-dim);
				text-align: center;
			}
		}
	}

	.menu-container {
		margin-bottom: 40rpx;

		.menu-title {
			display: flex;
			align-items: center;
			margin-bottom: 20rpx;

			.title-line {
				width: 8rpx;
				height: 35rpx;
				border-radius: 4rpx;
				margin-right: 15rpx;
			}

			.line-blue {
				background: linear-gradient(to bottom, #4facfe, #00f2fe);
			}

			.line-pink {
				background: linear-gradient(to bottom, #fa709a, #fee140);
			}

			.title-text {
				font-size: 32rpx;
				font-weight: bold;
				color: var(--text-primary);
			}
		}

		.menu-list {
			display: flex;
			flex-direction: column;
			gap: 15rpx;
		}

		.menu-item {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 30rpx;
			border-radius: 16rpx;
			transition: all 0.3s ease;

			&:active {
				transform: scale(0.98);
			}

			.menu-left {
				display: flex;
				align-items: center;

				.menu-icon {
					font-size: 40rpx;
					margin-right: 20rpx;
				}

				.menu-text {
					font-size: 30rpx;
					color: var(--text-primary);
				}
			}

			.icon-xiangyou {
				font-size: 28rpx;
				color: var(--text-muted);
			}
		}
	}

	.icp-footer {
		display: flex;
		justify-content: center;
		padding: 24rpx 0 16rpx;

		&:active {
			opacity: 0.75;
		}

		.icp-text {
			font-size: 24rpx;
			color: var(--text-muted);
		}
	}
</style>