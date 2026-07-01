<template>
	<dark-page-meta />
	<view class="modify-password-page" :class="themeClass">
		<view class="header">
			<view class="title">{{ hasPassword ? '修改密码' : '设置密码' }}</view>
			<view class="subtitle">{{ hasPassword ? '请输入旧密码和新密码' : '请设置您的登录密码' }}</view>
		</view>
		
		<view class="form-section boxBg">
			<view class="form-item form-item--password" v-if="hasPassword">
				<text class="form-icon">🔐</text>
				<password-field
					v-model="oldPassword"
					placeholder="请输入旧密码"
				/>
			</view>
			<ios-autofill-decoy />
			<view class="form-item form-item--password">
				<text class="form-icon">🔒</text>
				<password-field
					v-model="newPassword"
					placeholder="请输入新密码（6-20位）"
				/>
			</view>
			<view class="form-item form-item--password">
				<text class="form-icon">🔒</text>
				<password-field
					v-model="confirmPassword"
					placeholder="请确认密码"
				/>
			</view>
			<view class="forgot-link" v-if="hasPassword" @click="goToForgetPassword">
				<text>忘记密码？</text>
			</view>
		</view>
		
		<view class="submit-section">
			<view class="submit-btn" :class="{ disabled: loading }" @click="handleSubmit">
				<text>{{ loading ? '提交中...' : (hasPassword ? '修改密码' : '设置密码') }}</text>
			</view>
		</view>
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { usePageTheme } from '@/utils/theme/useTheme.js'

	const { themeClass } = usePageTheme()
	import { ref } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import { apiModifyUserPw } from '@/api/api.js'
	import { isApiSuccess, getApiMessage } from '@/utils/user/authHelper.js'
	import { clearAuthSession } from '@/utils/user/session.js'
	import { hasValidToken } from '@/utils/request.js'
	import { resolveHasPassword } from '@/utils/user/passwordStatus.js'
	import PasswordField from '@/components/user/PasswordField.vue'
	import IosAutofillDecoy from '@/components/user/IosAutofillDecoy.vue'

	const hasPassword = ref(false)
	const oldPassword = ref('')
	const newPassword = ref('')
	const confirmPassword = ref('')
	const phone = ref('')
	const loading = ref(false)

	onLoad(() => {
		const stored = uni.getStorageSync('userInfoStorage')
		const userInfo = uni.getStorageSync('userInfo')
		hasPassword.value = resolveHasPassword(stored, resolveHasPassword(userInfo, false))
		phone.value = userInfo?.phone || stored?.phone || ''
	})

	const goToLoginAfterSuccess = () => {
		clearAuthSession()
		uni.showToast({ title: '修改成功', icon: 'success' })
		setTimeout(() => {
			uni.reLaunch({ url: '/pages/user/login' })
		}, 1500)
	}

	const handleSubmit = async () => {
		if (loading.value) return
		if (!hasValidToken()) {
			uni.showToast({ title: '请先登录', icon: 'none' })
			setTimeout(() => {
				uni.reLaunch({ url: '/pages/user/login' })
			}, 1500)
			return
		}
		if (!phone.value) {
			uni.showToast({ title: '未获取到手机号，请重新登录', icon: 'none' })
			return
		}
		if (hasPassword.value && !oldPassword.value) {
			uni.showToast({ title: '请输入旧密码', icon: 'none' })
			return
		}
		if (!newPassword.value || newPassword.value.length < 6) {
			uni.showToast({ title: '密码至少6位', icon: 'none' })
			return
		}
		if (newPassword.value !== confirmPassword.value) {
			uni.showToast({ title: '两次密码不一致', icon: 'none' })
			return
		}

		loading.value = true
		uni.showLoading({ title: '提交中...', mask: true })
		try {
			const res = await apiModifyUserPw({
				phone: phone.value,
				password: newPassword.value,
				oldPassword: hasPassword.value ? oldPassword.value : ''
			})
			const body = res.data
			if (!isApiSuccess(body)) {
				uni.showToast({ title: getApiMessage(body, '修改失败'), icon: 'none' })
				return
			}
			goToLoginAfterSuccess()
		} catch (err) {
			console.error('[handleSubmit]', err)
			uni.showToast({
				title: err?.message || getApiMessage(err?.data, '修改失败'),
				icon: 'none'
			})
		} finally {
			loading.value = false
			uni.hideLoading()
		}
	}

	const goToForgetPassword = () => {
		uni.navigateTo({
			url: '/pages/user/forgetPassword'
		})
	}
</script>

<style lang="scss">
	.modify-password-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));
		padding: 80rpx 60rpx;
	}

	.header {
		text-align: center;
		margin-bottom: 60rpx;

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

	.form-section {
		border-radius: 20rpx;
		padding: 30rpx;
		margin-bottom: 40rpx;

		.form-item {
			display: flex;
			align-items: center;
			padding: 25rpx 0;

			&:not(:last-child) {
				border-bottom: 1rpx solid var(--border-color);
			}

			.form-icon {
				font-size: 36rpx;
				margin-right: 20rpx;
				flex-shrink: 0;
			}

			.form-input {
				flex: 1;
				font-size: 30rpx;
				color: var(--text-primary);

				&::placeholder {
					color: var(--text-faint);
				}
			}
		}

		.forgot-link {
			text-align: right;
			margin-top: 20rpx;

			text {
				font-size: 26rpx;
				color: #4facfe;
			}
		}
	}

	.submit-section {
		.submit-btn {
			background: linear-gradient(to right, #4facfe, #00f2fe);
			padding: 30rpx;
			border-radius: 50rpx;
			text-align: center;

			&.disabled {
				opacity: 0.7;
			}

			text {
				font-size: 32rpx;
				font-weight: bold;
				color: var(--text-primary);
			}
		}
	}

	.boxBg {
		background: rgba(0, 0, 0, 0.4);
	}
</style>
