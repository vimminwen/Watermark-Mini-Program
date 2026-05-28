<template>
	<dark-page-meta />
	<view class="login-page">
		<view class="header">
			<view class="logo">🖼️</view>
			<view class="title">云途汇水印</view>
			<view class="subtitle">登录后享受更多服务</view>
		</view>
		
		<view class="login-form">
			<view class="input-group">
				<text class="input-icon">📱</text>
				<input 
					class="input-field" 
					type="number" 
					placeholder="请输入手机号"
					v-model="phone"
					maxlength="11"
				/>
			</view>
			
			<view class="input-group">
				<text class="input-icon">🔒</text>
				<input 
					class="input-field" 
					type="password" 
					placeholder="请输入密码"
					v-model="password"
					maxlength="20"
				/>
			</view>
			
			<view class="extra-actions">
				<text class="link-text" @click="goToRegister">注册账号</text>
				<text class="link-text" @click="goToForgetPassword">忘记密码？</text>
			</view>
			
			<view class="login-button" :class="{ disabled: loading || quickLoginLoading }" @click="handleLogin">
				<text>{{ loading ? '登录中...' : '登录' }}</text>
			</view>

			<view class="divider">
				<view class="divider-line"></view>
				<text class="divider-text">其他登录方式</text>
				<view class="divider-line"></view>
			</view>
			<phone-quick-login-btn
				custom-class="login-quick-btn"
				:disabled="loading"
				show-dev-tip
				@loading="onQuickLoginLoading"
			/>
			
			<view class="divider">
				<view class="divider-line"></view>
				<text class="divider-text">登录即表示同意</text>
				<view class="divider-line"></view>
			</view>
			
			<view class="agreement-text">
				<text class="link-text" @click="goToAgreement">《用户协议》</text>
				<text class="link-text" @click="goToPrivacy">《隐私政策》</text>
			</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { ref } from 'vue'
	import { apiLogin } from '@/api/api.js'
	import { isLoginSuccess } from '@/utils/user/authHelper.js'
	import { clearAuthSession, getApiMessage, persistAuthSession, refreshUserProfile } from '@/utils/user/session.js'
	import { isNoTokenError } from '@/utils/request.js'
	import { buildLoginPayload } from '@/utils/user/rsaEncrypt.js'

	const phone = ref('')
	const password = ref('')
	const loading = ref(false)
	const quickLoginLoading = ref(false)

	const onQuickLoginLoading = (val) => {
		quickLoginLoading.value = val
	}

	const isValidPhone = () => /^1\d{10}$/.test(phone.value)

	const finishLoginSuccess = async (body) => {
		const { token, userId } = persistAuthSession(body)
		if (!token) {
			uni.showToast({ title: '登录成功但未获取到 token', icon: 'none' })
			return
		}
		if (userId) {
			await refreshUserProfile(userId)
		}
		uni.showToast({ title: '登录成功', icon: 'success' })
		setTimeout(() => {
			uni.reLaunch({
				url: '/pages/index/index'
			})
		}, 1500)
	}

	const handleLogin = async () => {
		if (loading.value || quickLoginLoading.value) return
		if (!isValidPhone()) {
			uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
			return
		}
		if (!password.value) {
			uni.showToast({ title: '请输入密码', icon: 'none' })
			return
		}

		loading.value = true
		uni.showLoading({ title: '登录中...', mask: true })
		try {
			// 避免请求头携带过期 token，导致后端返回「请先登录」
			clearAuthSession()
			const res = await apiLogin(buildLoginPayload(phone.value, password.value))
			const body = res.data
			if (!isLoginSuccess(body)) {
				let failMsg = getApiMessage(body, '登录失败')
				if (/请先登录/i.test(failMsg)) {
					failMsg = '账号或密码错误，请重试'
				}
				uni.showToast({ title: failMsg, icon: 'none' })
				return
			}

			await finishLoginSuccess(body)
		} catch (err) {
			console.error('[handleLogin]', err)
			let msg = err?.message || getApiMessage(err?.data, '登录失败，请稍后重试')
			if (isNoTokenError(err)) {
				msg = '登录请求被拦截，请重新编译后再试'
			} else if (/请先登录/i.test(msg)) {
				msg = getApiMessage(err?.data, '账号或密码错误，请重试')
			}
			uni.showToast({ title: msg, icon: 'none' })
		} finally {
			loading.value = false
			uni.hideLoading()
		}
	}

	const goToRegister = () => {
		uni.navigateTo({
			url: '/pages/user/register'
		})
	}

	const goToForgetPassword = () => {
		uni.navigateTo({
			url: '/pages/user/forgetPassword'
		})
	}

	const goToAgreement = () => {
		uni.navigateTo({
			url: '/pages/my/agreement'
		})
	}

	const goToPrivacy = () => {
		uni.navigateTo({
			url: '/pages/my/privacy'
		})
	}
</script>

<style lang="scss">
	.login-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, #050d40, #233968);
		padding: 80rpx 60rpx;
	}

	.header {
		text-align: center;
		margin-bottom: 100rpx;

		.logo {
			font-size: 120rpx;
			margin-bottom: 30rpx;
		}

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

	.login-form {
		.input-group {
			display: flex;
			align-items: center;
			background: rgba(255, 255, 255, 0.08);
			border-radius: 16rpx;
			padding: 30rpx;
			margin-bottom: 30rpx;

			.input-icon {
				font-size: 36rpx;
				margin-right: 20rpx;
			}

			.input-field {
				flex: 1;
				font-size: 30rpx;
				color: #ffffff;

				&::placeholder {
					color: rgba(255, 255, 255, 0.4);
				}
			}
		}

		.extra-actions {
			display: flex;
			justify-content: space-between;
			margin-bottom: 60rpx;

			.link-text {
				font-size: 26rpx;
				color: #4facfe;
			}
		}

		.login-button {
			background: linear-gradient(to right, #4facfe, #00f2fe);
			padding: 30rpx;
			border-radius: 50rpx;
			text-align: center;
			margin-bottom: 40rpx;

			&.disabled {
				opacity: 0.7;
			}

			text {
				font-size: 32rpx;
				font-weight: bold;
				color: #ffffff;
			}
		}

		:deep(.login-quick-btn) {
			margin-bottom: 40rpx;
		}

		.divider {
			display: flex;
			align-items: center;
			margin-bottom: 60rpx;

			.divider-line {
				flex: 1;
				height: 1rpx;
				background: rgba(255, 255, 255, 0.2);
			}

			.divider-text {
				font-size: 24rpx;
				color: rgba(255, 255, 255, 0.5);
				padding: 0 30rpx;
			}
		}

		.third-party {
			display: flex;
			justify-content: center;

			.third-party-btn {
				display: flex;
				flex-direction: column;
				align-items: center;
				padding: 30rpx 80rpx;
				background: rgba(79, 172, 254, 0.1);
				border-radius: 20rpx;
				border: 2rpx solid rgba(79, 172, 254, 0.3);

				.btn-icon {
					font-size: 60rpx;
					margin-bottom: 15rpx;
				}

				.btn-text {
					font-size: 26rpx;
					color: #ffffff;
				}
			}
		}
	}

	.agreement-text {
		display: flex;
		justify-content: center;
		gap: 30rpx;
	}
</style>
