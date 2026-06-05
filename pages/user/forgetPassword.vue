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
				/>
			</view>
			
			<view class="input-group">
				<text class="input-icon">🔐</text>
				<input 
					class="input-field" 
					type="number" 
					placeholder="请输入验证码"
					v-model="code"
					maxlength="6"
				/>
				<view class="send-code" :class="{ disabled: countdown > 0 }" @click="sendCode">
					<text>{{ countdown > 0 ? countdown + 's' : '获取验证码' }}</text>
				</view>
			</view>
			
			<view class="input-group">
				<text class="input-icon">🔒</text>
				<input 
					class="input-field" 
					type="password" 
					placeholder="请设置新密码（6-20位）"
					v-model="password"
					maxlength="20"
				/>
			</view>
			
			<view class="input-group">
				<text class="input-icon">🔒</text>
				<input 
					class="input-field" 
					type="password" 
					placeholder="请确认新密码"
					v-model="confirmPassword"
					maxlength="20"
				/>
			</view>
			
			<view class="submit-button" @click="handleSubmit">
				<text>确认重置</text>
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

	const phone = ref('')
	const code = ref('')
	const password = ref('')
	const confirmPassword = ref('')
	const countdown = ref(0)

	const sendCode = () => {
		if (countdown.value > 0) return
		if (!phone.value || phone.value.length !== 11) {
			uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
			return
		}
		countdown.value = 60
		const timer = setInterval(() => {
			countdown.value--
			if (countdown.value <= 0) {
				clearInterval(timer)
			}
		}, 1000)
		uni.showToast({ title: '验证码已发送', icon: 'none' })
	}

	const handleSubmit = () => {
		if (!phone.value) {
			uni.showToast({ title: '请输入手机号', icon: 'none' })
			return
		}
		if (!code.value) {
			uni.showToast({ title: '请输入验证码', icon: 'none' })
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
		uni.showToast({ title: '密码重置功能开发中', icon: 'none' })
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
			}

			.input-field {
				flex: 1;
				font-size: 30rpx;
				color: var(--text-primary);

				&::placeholder {
					color: var(--text-faint);
				}
			}

			.send-code {
				padding: 15rpx 25rpx;
				background: rgba(79, 172, 254, 0.2);
				border-radius: 30rpx;
				font-size: 24rpx;
				color: #4facfe;

				&.disabled {
					color: var(--text-faint);
					background: var(--surface-bg-light);
				}
			}
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
