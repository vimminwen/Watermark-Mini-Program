<template>
	<dark-page-meta />
	<view class="my-page">
		<view class="user-section" @click="goToUserCenter">
			<view class="user-info">
				<image
					class="avatar"
					:src="displayAvatar"
					mode="aspectFit"
				></image>
				<view class="user-text">
					<text class="username">{{ isLoggedIn ? userProfile.nickname : '点击登录' }}</text>
					<text v-if="showUserLevel" class="user-level">{{ userProfile.level }}</text>
				</view>
			</view>
		</view>
		
		<view class="member-section boxBg">
			<view class="member-header">
				<view class="member-badge">
					<text class="badge-icon">👑</text>
					<view class="badge-level">专业版</view>
				</view>
				<view class="member-info">
					<text class="member-title">尊贵会员</text>
					<view class="member-detail">
						<text class="member-expire">有效期至 2025-12-31</text>
						<view class="member-progress">
							<view class="progress-bar">
								<view class="progress-fill" :style="{ width: '65%' }"></view>
							</view>
							<text class="progress-text">已使用 65%</text>
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
				<view 
					class="menu-item boxBg" 
					v-for="item in category.children" 
					:key="item.id"
					v-show="item.show === '1'"
					@click="handleMenuClick(item)"
				>
					<view class="menu-left">
						<text class="menu-icon">{{ item.icon }}</text>
						<text class="menu-text">{{ item.title }}</text>
					</view>
					<text class="iconfont icon-xiangyou"></text>
				</view>
			</view>
		</view>
		
		<view class="version-info">
			<text class="version-text">汇水印 v1.0.0</text>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { computed, ref } from 'vue'
	import { onShow } from '@dcloudio/uni-app'
	import myMenu from '@/api/data/myMenu.json'
	import { apiGetUserInfo } from '@/api/api.js'
	import { hasValidToken } from '@/utils/request.js'

	const defaultProfile = {
		avatar: '/static/logo.png',
		nickname: '汇水印用户',
		level: '普通用户'
	}

	const LOGO = '/static/logo.png'

	const resolveAvatar = (avatar) => {
		const value = typeof avatar === 'string' ? avatar.trim() : ''
		return value || LOGO
	}

	const isLoggedIn = ref(false)
	const userProfile = ref({ ...defaultProfile })

	const displayAvatar = computed(() => {
		if (!isLoggedIn.value) return LOGO
		return resolveAvatar(userProfile.value.avatar)
	})

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
		const userId = uni.getStorageSync('userIdStorage')
		if (!hasValidToken() || !userId) {
			isLoggedIn.value = false
			userProfile.value = { ...defaultProfile }
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

	onShow(() => {
		loadUserProfile()
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

	const goToCancel = () => {
		uni.navigateTo({
			url: '/pages/member/cancel'
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
</script>

<style lang="scss">
	.my-page {
		min-height: 100vh;
		padding: 0 30rpx 120rpx;
		background: linear-gradient(to bottom, #050d40, #233968);
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
				background: rgba(255, 255, 255, 0.1);
			}
			
			.user-text {
				display: flex;
				flex-direction: column;
				
				.username {
					font-size: 34rpx;
					font-weight: bold;
					color: #ffffff;
					margin-bottom: 10rpx;
				}
				
				.user-level {
					font-size: 26rpx;
					color: rgba(255, 255, 255, 0.7);
					background: rgba(255, 255, 255, 0.1);
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
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
		backdrop-filter: blur(20rpx);
		
		.member-header {
			display: flex;
			align-items: center;
			padding-bottom: 25rpx;
			border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);
			margin-bottom: 25rpx;
			
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
					color: #ffffff;
					margin-bottom: 10rpx;
				}
				
				.member-detail {
					display: flex;
					flex-direction: column;
					
					.member-expire {
						font-size: 24rpx;
						color: rgba(255, 255, 255, 0.7);
						margin-bottom: 8rpx;
					}
					
					.member-progress {
						display: flex;
						align-items: center;
						gap: 15rpx;
						
						.progress-bar {
							flex: 1;
							height: 8rpx;
							background: rgba(255, 255, 255, 0.2);
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
							color: rgba(255, 255, 255, 0.6);
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
				background: rgba(255, 255, 255, 0.1);
				border-radius: 50%;
				
				.icon-xiangyou {
					font-size: 32rpx;
					color: rgba(255, 255, 255, 0.6);
				}
			}
		}
		
		.member-benefits {
			display: flex;
			align-items: center;
			justify-content: space-around;
			padding: 25rpx 0;
			border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);
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
					color: rgba(255, 255, 255, 0.8);
				}
			}
			
			.benefit-divider {
				width: 1rpx;
				height: 50rpx;
				background: rgba(255, 255, 255, 0.1);
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
			background: rgba(255, 255, 255, 0.05);
			border-radius: 16rpx;
			transition: all 0.3s ease;
			
			&:active {
				transform: scale(0.95);
				background: rgba(255, 255, 255, 0.1);
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
				color: rgba(255, 255, 255, 0.9);
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
				color: #ffffff;
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
					color: #ffffff;
				}
			}
			
			.icon-xiangyou {
				font-size: 28rpx;
				color: rgba(255, 255, 255, 0.5);
			}
		}
	}

	.version-info {
		text-align: center;
		padding: 40rpx 0;
		
		.version-text {
			font-size: 26rpx;
			color: rgba(255, 255, 255, 0.5);
		}
	}
</style>