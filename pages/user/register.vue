<template>
	<dark-page-meta />
	<view class="register-page" :class="themeClass">
		<view class="header">
			<view class="title">注册账号</view>
			<view class="subtitle">加入汇水印</view>
		</view>
		
		<view class="register-form">
			<view class="input-group">
				<text class="input-icon"></text>
				<input 
					class="input-field" 
					type="number" 
					placeholder="请输入手机号"
					v-model="phone"
					maxlength="11"
				/>
			</view>
			
			<view class="input-group">
				<text class="input-icon"></text>
				<input 
					class="input-field" 
					type="text" 
					placeholder="昵称（选填）"
					v-model="nickname"
					maxlength="20"
				/>
			</view>

			<ios-autofill-decoy />

			<view class="input-group input-group--password">
				<text class="input-icon"></text>
				<password-field
					v-model="password"
					placeholder="请设置密码（6-20位）"
					:maxlength="20"
				/>
			</view>
			
			<view class="input-group input-group--password">
				<text class="input-icon"></text>
				<password-field
					v-model="confirmPassword"
					placeholder="请确认密码"
					:maxlength="20"
				/>
			</view>

			<agreement-consent
				v-model="agreedToTerms"
				@open-agreement="goToAgreement"
				@open-privacy="goToPrivacy"
			/>

			<view class="register-button" :class="{ disabled: loading }" @click="handleRegister">
				<text>{{ loading ? '注册中...' : '注册' }}</text>
			</view>
			
			<view class="login-link">
				<text class="link-text">已有账号？</text>
				<text class="link-text primary" @click="goToLogin">立即登录</text>
			</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { usePageTheme } from '@/utils/theme/useTheme.js'

	const { themeClass } = usePageTheme()
	import { ref } from 'vue'
	import { apiLogin, apiRegister } from '@/api/api.js'
	import {
		isRegisterSuccess,
		isLoginSuccess,
		extractRegisterUserId,
		getApiMessage
	} from '@/utils/user/authHelper.js'
	import { clearAuthSession, persistAuthSession, refreshUserProfile } from '@/utils/user/session.js'
	import { buildLoginPayload } from '@/utils/user/rsaEncrypt.js'
	import { useAgreementConsent } from '@/utils/user/agreementConsent.js'
	import AgreementConsent from '@/components/user/AgreementConsent.vue'
	import PasswordField from '@/components/user/PasswordField.vue'
	import IosAutofillDecoy from '@/components/user/IosAutofillDecoy.vue'

	const phone = ref('')
	const nickname = ref('')
	const password = ref('')
	const confirmPassword = ref('')
	const loading = ref(false)
	const { agreedToTerms, ensureAgreed } = useAgreementConsent()

	const isValidPhone = () => /^1\d{10}$/.test(phone.value)

	const handleRegister = () => {
		if (loading.value) return
		ensureAgreed(doRegister)
	}

	const doRegister = async () => {
		if (!isValidPhone()) {
			uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
			return
		}
		if (!password.value || password.value.length < 6) {
			uni.showToast({ title: '密码至少6位', icon: 'none' })
			return
		}
		if (password.value !== confirmPassword.value) {
			uni.showToast({ title: '两次密码不一致', icon: 'none' })
			return
		}

		const finalNickname = nickname.value.trim() || `用户${phone.value.slice(-4)}`

		loading.value = true
		uni.showLoading({ title: '注册中...', mask: true })
		try {
			const registerRes = await apiRegister({
				phone: phone.value,
				password: password.value,
				nickname: finalNickname,
				email: '',
				image: ''
			})
			const registerBody = registerRes.data
			if (!isRegisterSuccess(registerBody)) {
				uni.showToast({ title: getApiMessage(registerBody, '注册失败'), icon: 'none' })
				return
			}

			const registeredUserId = extractRegisterUserId(registerBody)

			uni.showLoading({ title: '正在登录...', mask: true })
			clearAuthSession()
			const loginRes = await apiLogin(buildLoginPayload(phone.value, password.value))
			const loginBody = loginRes.data
			if (!isLoginSuccess(loginBody)) {
				uni.showToast({ title: getApiMessage(loginBody, '注册成功，请登录'), icon: 'none' })
				setTimeout(() => {
					uni.navigateBack()
				}, 1500)
				return
			}

			const { token, userId } = persistAuthSession(loginBody)
			if (!token) {
				uni.showToast({ title: '注册成功，请登录', icon: 'none' })
				setTimeout(() => {
					uni.navigateBack()
				}, 1500)
				return
			}

			const finalUserId = userId || registeredUserId
			if (finalUserId) {
				await refreshUserProfile(finalUserId)
			}

			uni.showToast({ title: getApiMessage(registerBody, '注册成功'), icon: 'success' })
			setTimeout(() => {
				uni.navigateBack({ delta: 2 })
			}, 1500)
		} catch (err) {
			console.error('[handleRegister]', err)
			const msg = err?.message || getApiMessage(err?.data, '操作失败，请稍后重试')
			if (err?.type === 'NO_TOKEN') {
				uni.showToast({ title: '注册成功，请登录', icon: 'none' })
			} else {
				uni.showToast({ title: msg, icon: 'none' })
			}
		} finally {
			loading.value = false
			uni.hideLoading()
		}
	}

	const goToLogin = () => {
		uni.navigateBack()
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
	.register-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));
		padding: 80rpx 60rpx;
	}

	.header {
		text-align: center;
		margin-bottom: 80rpx;

		.title {
			font-size: 48rpx;
			font-weight: bold;
			color: var(--text-primary);
			margin-bottom: 15rpx;
		}

		.subtitle {
			font-size: 28rpx;
			color: var(--text-subtle);
		}
	}

	.register-form {
		.input-group {
			display: flex;
			align-items: center;
			background: var(--surface-bg);
			border-radius: 16rpx;
			padding: 30rpx;
			margin-bottom: 30rpx;

			.input-icon {
				font-size: 36rpx;
				margin-right: 20rpx;
				flex-shrink: 0;
			}

			.input-field {
				flex: 1;
				font-size: 30rpx;
				color: var(--text-primary);

				&::placeholder {
					color: var(--text-faint);
				}
			}
		}

		.register-button {
			background: linear-gradient(to right, #4facfe, #00f2fe);
			padding: 30rpx;
			border-radius: 50rpx;
			text-align: center;
			margin-top: 30rpx;
			margin-bottom: 40rpx;

			&.disabled {
				opacity: 0.7;
			}

			text {
				font-size: 32rpx;
				font-weight: bold;
				color: var(--text-primary);
			}
		}

		.login-link {
			display: flex;
			justify-content: center;
			gap: 10rpx;

			.link-text {
				font-size: 26rpx;
				color: var(--text-subtle);

				&.primary {
					color: #4facfe;
				}
			}
		}
	}
</style>
