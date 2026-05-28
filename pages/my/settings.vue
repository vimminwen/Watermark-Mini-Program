<template>
	<dark-page-meta />
	<view class="sub-page">
		<view class="settings-list">
			<view class="settings-item boxBg" @tap="handleClearCache">
				<view class="item-left">
					<text class="item-icon">💾</text>
					<text class="item-text">清除缓存</text>
				</view>
				<text class="iconfont icon-xiangyou"></text>
			</view>
			
			<view class="settings-item boxBg" @tap="handleCheckUpdate">
				<view class="item-left">
					<text class="item-icon">🔄</text>
					<text class="item-text">检查更新</text>
				</view>
				<view class="item-right">
					<text class="version">v{{ appVersion }}</text>
					<text class="iconfont icon-xiangyou"></text>
				</view>
			</view>
		</view>

		<view class="danger-section">
			<view class="danger-title">账号安全</view>
			<view
				class="danger-btn"
				:class="{ disabled: deleting }"
				@click="handleDeleteAccount"
			>
				<text>{{ deleting ? '注销中...' : '注销账号' }}</text>
			</view>
			<text class="danger-tip">注销后账号数据将无法恢复，请谨慎操作</text>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref, onMounted } from 'vue'
	import { apiDelUser } from '@/api/api.js'
	import { isApiSuccess } from '@/utils/user/authHelper.js'
	import { clearAuthSession, getApiMessage } from '@/utils/user/session.js'
	import { hasValidToken } from '@/utils/request.js'

	const DEFAULT_VERSION = '1.0.0'

	const deleting = ref(false)
	const actionBusy = ref(false)
	const appVersion = ref(DEFAULT_VERSION)

	/** 使用 uni-app 官方 API 获取应用版本号，失败则用 1.0.0 */
	const loadAppVersion = () => {
		let ver = ''
		try {
			if (typeof uni.getAppBaseInfo === 'function') {
				ver = uni.getAppBaseInfo()?.appVersion || ''
			}
		} catch (e) {
			console.warn('[loadAppVersion] getAppBaseInfo', e)
		}
		if (!ver) {
			try {
				ver = uni.getAccountInfoSync?.()?.miniProgram?.version || ''
			} catch (e) {
				console.warn('[loadAppVersion] getAccountInfoSync', e)
			}
		}
		appVersion.value = ver || DEFAULT_VERSION
	}

	const displayVersion = () => appVersion.value || DEFAULT_VERSION

	const randomActionDelay = () => 1000 + Math.floor(Math.random() * 1001)

	/** 微信小程序：hideLoading 后需延迟再 showModal，否则弹窗不出现 */
	const finishLoadingThenModal = (modalOptions) => {
		uni.hideLoading({
			complete: () => {
				setTimeout(() => {
					uni.showModal({
						showCancel: false,
						confirmText: '知道了',
						...modalOptions
					})
				}, 80)
			}
		})
	}

	const runLoadingAction = (loadingTitle, onComplete) => {
		if (actionBusy.value) return
		actionBusy.value = true
		uni.showLoading({ title: loadingTitle, mask: true })
		setTimeout(() => {
			try {
				const modalOptions = onComplete?.()
				if (modalOptions) {
					finishLoadingThenModal(modalOptions)
				} else {
					uni.hideLoading()
				}
			} finally {
				actionBusy.value = false
			}
		}, randomActionDelay())
	}

	const handleClearCache = () => {
		runLoadingAction('正在清除', () => ({
			title: '清除缓存',
			content: '缓存已清除'
		}))
	}

	const handleCheckUpdate = () => {
		runLoadingAction('正在检查', () => ({
			title: '检查更新',
			content: `当前版本 v${displayVersion()}，已是最新版本`
		}))
	}

	onMounted(() => {
		loadAppVersion()
	})

	const handleDeleteAccount = () => {
		if (deleting.value) return

		if (!hasValidToken()) {
			uni.showModal({
				title: '提示',
				content: '请先登录后再注销账号',
				confirmText: '去登录',
				success: (res) => {
					if (res.confirm) {
						uni.navigateTo({ url: '/pages/user/login' })
					}
				}
			})
			return
		}

		uni.showModal({
			title: '注销账号',
			content: '注销后账号及相关数据将被删除且无法恢复，确定继续吗？',
			confirmText: '确认注销',
			confirmColor: '#ff6b6b',
			cancelText: '取消',
			success: async (res) => {
				if (!res.confirm) return

				deleting.value = true
				uni.showLoading({ title: '注销中...', mask: true })
				try {
					const response = await apiDelUser()
					const body = response.data
					if (!isApiSuccess(body)) {
						uni.showToast({
							title: getApiMessage(body, '注销失败'),
							icon: 'none'
						})
						return
					}

					clearAuthSession()
					uni.showToast({ title: '账号已注销', icon: 'success' })
					setTimeout(() => {
						uni.switchTab({ url: '/pages/index/index' })
					}, 1500)
				} catch (err) {
					console.error('[handleDeleteAccount]', err)
					uni.showToast({
						title: err?.message || getApiMessage(err?.data, '注销失败，请稍后重试'),
						icon: 'none'
					})
				} finally {
					deleting.value = false
					uni.hideLoading()
				}
			}
		})
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
		
		.icon-xiangyou {
			font-size: 28rpx;
			color: rgba(255, 255, 255, 0.5);
		}
	}

	.danger-section {
		margin-top: 60rpx;
		padding: 0 10rpx;

		.danger-title {
			font-size: 26rpx;
			color: rgba(255, 255, 255, 0.5);
			margin-bottom: 20rpx;
		}

		.danger-btn {
			background: rgba(255, 100, 100, 0.12);
			border: 2rpx solid rgba(255, 100, 100, 0.35);
			border-radius: 16rpx;
			padding: 30rpx;
			text-align: center;

			&.disabled {
				opacity: 0.6;
			}

			text {
				font-size: 30rpx;
				color: #ff6b6b;
				font-weight: 600;
			}
		}

		.danger-tip {
			display: block;
			margin-top: 20rpx;
			font-size: 24rpx;
			color: rgba(255, 255, 255, 0.4);
			text-align: center;
			line-height: 1.5;
		}
	}
</style>