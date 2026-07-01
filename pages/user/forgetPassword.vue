<template>

	<dark-page-meta />

	<view class="forget-page" :class="themeClass">

		<view class="header">

			<view class="title">忘记密码</view>

			<view class="subtitle">重置您的密码</view>

		</view>

		

		<view class="forget-form">

			<view class="input-group">

				<text class="input-icon">📱</text>

				<input 
					class="input-field" 
					type="number" 
					placeholder="请输入手机号"
					v-model="phone"
					maxlength="11"
					autocomplete="off"
				/>

			</view>

			<ios-autofill-decoy />

			<view class="input-group input-group--password">

				<text class="input-icon">🔒</text>

				<password-field

					v-model="password"

					placeholder="请设置新密码（6-20位）"

					:maxlength="20"

				/>

			</view>

			

			<view class="input-group input-group--password">

				<text class="input-icon">🔒</text>

				<password-field

					v-model="confirmPassword"

					placeholder="请确认新密码"

					:maxlength="20"

				/>

			</view>

			

			<view class="submit-button" :class="{ disabled: loading }" @click="handleSubmit">

				<text>{{ loading ? '提交中...' : '确认重置' }}</text>

			</view>

			

			<view class="login-link">

				<text class="link-text">想起密码了？</text>

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

	import PasswordField from '@/components/user/PasswordField.vue'

	import IosAutofillDecoy from '@/components/user/IosAutofillDecoy.vue'

	import { apiForgetPassword } from '@/api/api.js'

	import { isApiSuccess, getApiMessage } from '@/utils/user/authHelper.js'



	const phone = ref('')

	const password = ref('')

	const confirmPassword = ref('')

	const loading = ref(false)



	const handleSubmit = async () => {

		if (loading.value) return

		if (!phone.value || phone.value.length !== 11) {

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



		loading.value = true

		uni.showLoading({ title: '提交中...', mask: true })

		try {

			const res = await apiForgetPassword({

				phone: phone.value,

				password: password.value,

				oldPassword: ''

			})

			const body = res.data

			if (!isApiSuccess(body)) {

				uni.showToast({ title: getApiMessage(body, '重置失败'), icon: 'none' })

				return

			}

			uni.showToast({ title: '重置成功', icon: 'success' })

			setTimeout(() => goToLogin(), 1500)

		} catch (err) {

			console.error('[forgetPassword]', err)

			uni.showToast({

				title: err?.message || getApiMessage(err?.data, '重置失败'),

				icon: 'none'

			})

		} finally {

			loading.value = false

			uni.hideLoading()

		}

	}



	const goToLogin = () => {

		uni.navigateBack()

	}

</script>



<style lang="scss">

	.forget-page {

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



	.forget-form {

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



		.input-group--password {

			padding-right: 30rpx;

		}



		.submit-button {

			background: linear-gradient(to right, #4facfe, #00f2fe);

			padding: 30rpx;

			border-radius: 50rpx;

			text-align: center;

			margin-top: 30rpx;

			margin-bottom: 40rpx;



			text {

				font-size: 32rpx;

				font-weight: bold;

				color: var(--text-primary);

			}



			&.disabled {

				opacity: 0.6;

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

