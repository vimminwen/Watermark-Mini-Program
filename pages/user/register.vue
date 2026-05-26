<template>
	<dark-page-meta />
	<view class="register-page">
		<view class="header">
			<view class="title">注册账号</view>
			<view class="subtitle">加入图片工具箱</view>
		</view>
		
		<view class="register-form">
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
					placeholder="请设置密码（6-20位）"
					v-model="password"
					maxlength="20"
				/>
			</view>
			
			<view class="input-group">
				<text class="input-icon">🔒</text>
				<input 
					class="input-field" 
					type="password" 
					placeholder="请确认密码"
					v-model="confirmPassword"
					maxlength="20"
				/>
			</view>
			
			<view class="register-button" @click="handleRegister">
				<text>注册</text>
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

	const handleRegister = () => {
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
		uni.showToast({ title: '注册功能开发中', icon: 'none' })
	}

	const goToLogin = () => {
		uni.navigateBack()
	}
</script>

<style lang="scss">
	.register-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, #050d40, #233968);
		padding: 80rpx 60rpx;
	}

	.header {
		text-align: center;
		margin-bottom: 80rpx;

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

	.register-form {
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

			.send-code {
				padding: 15rpx 25rpx;
				background: rgba(79, 172, 254, 0.2);
				border-radius: 30rpx;
				font-size: 24rpx;
				color: #4facfe;

				&.disabled {
					color: rgba(255, 255, 255, 0.4);
					background: rgba(255, 255, 255, 0.05);
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

			text {
				font-size: 32rpx;
				font-weight: bold;
				color: #ffffff;
			}
		}

		.login-link {
			display: flex;
			justify-content: center;
			gap: 10rpx;

			.link-text {
				font-size: 26rpx;
				color: rgba(255, 255, 255, 0.6);

				&.primary {
					color: #4facfe;
				}
			}
		}
	}
</style>
