<template>
	<view class="phone-quick-login" :class="[customClass, { 'is-disabled': disabled }]">
		<!-- #ifdef MP-WEIXIN -->
		<button
			class="phone-quick-login__btn"
			:class="[btnClass, { 'is-loading': loading }]"
			open-type="agreePrivacyAuthorization|getPhoneNumber"
			@agreeprivacyauthorization="onAgreePrivacy"
			@getphonenumber="onGetPhoneNumber"
		>
			<slot :loading="loading">
				<text v-if="icon" class="phone-quick-login__icon">{{ icon }}</text>
				<text class="phone-quick-login__text">{{ loading ? loadingText : btnText }}</text>
			</slot>
		</button>
		<!-- #endif -->

		<!-- #ifndef MP-WEIXIN -->
		<view class="phone-quick-login__btn phone-quick-login__btn--unsupported" @tap="onNotSupported">
			<slot :loading="loading">
				<text v-if="icon" class="phone-quick-login__icon">{{ icon }}</text>
				<text class="phone-quick-login__text">{{ btnText }}</text>
			</slot>
		</view>
		<!-- #endif -->

		<text v-if="showDevTip" class="phone-quick-login__tip">{{ devTip }}</text>
	</view>
</template>

<script setup>
	import { ref, watch } from 'vue'
	import { phoneQuickLoginFromDetail } from '@/utils/user/wechatAuth.js'
	import {
		isPrivacyScopeNotDeclared,
		openPrivacyContract,
		showPrivacyScopeNotDeclaredModal
	} from '@/utils/wx/privacy.js'
	import { isLoginSuccess } from '@/utils/user/authHelper.js'
	import {
		clearAuthSession,
		getApiMessage,
		persistAuthSession,
		refreshUserProfile
	} from '@/utils/user/session.js'

	const props = defineProps({
		/** 按钮文案 */
		btnText: {
			type: String,
			default: '微信手机号快捷登录'
		},
		loadingText: {
			type: String,
			default: '登录中...'
		},
		icon: {
			type: String,
			default: '📱'
		},
		/** 根节点额外 class，用于页面里改样式 */
		customClass: {
			type: String,
			default: ''
		},
		/** 按钮本身 class */
		btnClass: {
			type: String,
			default: ''
		},
		disabled: {
			type: Boolean,
			default: false
		},
		showDevTip: {
			type: Boolean,
			default: false
		},
		devTip: {
			type: String,
			default: '微信开发者工具可在「详情 - 本地设置」中开启模拟手机号'
		},
		/** 登录成功后跳转地址 */
		redirectUrl: {
			type: String,
			default: '/pages/index/index'
		},
		autoNavigate: {
			type: Boolean,
			default: true
		},
		navigateDelay: {
			type: Number,
			default: 1500
		},
		successToast: {
			type: String,
			default: '登录成功'
		},
		clearSessionBeforeLogin: {
			type: Boolean,
			default: true
		}
	})

	const emit = defineEmits(['success', 'fail', 'loading', 'cancel'])

	const loading = ref(false)

	watch(loading, (val) => {
		emit('loading', val)
	})

	const setLoading = (val) => {
		loading.value = val
	}

	const finishLoginSuccess = async (body) => {
		const { token, userId } = persistAuthSession(body)
		if (!token) {
			throw new Error('登录成功但未获取到 token')
		}
		if (userId) {
			await refreshUserProfile(userId)
		}
		emit('success', body)
		if (props.successToast) {
			uni.showToast({ title: props.successToast, icon: 'success' })
		}
		if (props.autoNavigate && props.redirectUrl) {
			setTimeout(() => {
				uni.reLaunch({ url: props.redirectUrl })
			}, props.navigateDelay)
		}
	}

	const onNotSupported = () => {
		uni.showToast({ title: '仅支持微信小程序', icon: 'none' })
	}

	const isGetPhoneNumberOk = (errMsg = '') => String(errMsg).includes('getPhoneNumber:ok')

	const onAgreePrivacy = (e) => {
		const errMsg = e?.detail?.errMsg || ''
		if (!String(errMsg).includes('agreePrivacyAuthorization:ok')) {
			console.warn('[PhoneQuickLoginButton] agreePrivacyAuthorization:', errMsg, e?.detail)
		}
	}

	const onGetPhoneNumber = async (e) => {
		if (loading.value || props.disabled) return

		const detail = e?.detail || {}
		const errMsg = detail.errMsg || ''

		if (!isGetPhoneNumberOk(errMsg)) {
			console.warn('[PhoneQuickLoginButton] getPhoneNumber:', errMsg, detail)
			if (isPrivacyScopeNotDeclared(detail)) {
				showPrivacyScopeNotDeclaredModal()
			} else if (/privacy|隐私|未同意|authorize/i.test(errMsg)) {
				await openPrivacyContract()
			}
			emit('cancel', detail)
			return
		}

		if (!detail.encryptedData && !detail.code) {
			console.warn('[PhoneQuickLoginButton] 无手机号凭证:', detail)
			emit('fail', { message: '未获取到手机号凭证', detail })
			return
		}

		setLoading(true)
		if (props.clearSessionBeforeLogin) {
			clearAuthSession()
		}
		uni.showLoading({ title: props.loadingText.replace(/\.\.\.$/, '') || '登录中', mask: true })

		try {
			const body = await phoneQuickLoginFromDetail(detail)
			if (!isLoginSuccess(body)) {
				const msg = getApiMessage(body, '登录失败')
				uni.showToast({ title: msg, icon: 'none' })
				emit('fail', { message: msg, data: body })
				return
			}
			await finishLoginSuccess(body)
		} catch (err) {
			console.error('[PhoneQuickLoginButton]', err)
			const msg = err?.message || getApiMessage(err?.data, '快捷登录失败，请稍后重试')
			uni.showToast({ title: msg, icon: 'none' })
			emit('fail', err)
		} finally {
			setLoading(false)
			uni.hideLoading()
		}
	}

	defineExpose({
		loading,
		setLoading
	})
</script>

<style lang="scss" scoped>
	.phone-quick-login {
		width: 100%;

		&.is-disabled {
			opacity: 0.65;
			pointer-events: none;
		}
	}

	.phone-quick-login__btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 28rpx 30rpx;
		margin: 0;
		box-sizing: border-box;
		background: rgba(79, 172, 254, 0.12);
		border: 2rpx solid rgba(79, 172, 254, 0.45);
		border-radius: 50rpx;
		line-height: 1.4;

		&::after {
			border: none;
		}

		&.is-loading {
			opacity: 0.7;
			pointer-events: none;
		}
	}

	.phone-quick-login__btn--unsupported {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.15);
	}

	.phone-quick-login__icon {
		font-size: 36rpx;
		margin-right: 12rpx;
	}

	.phone-quick-login__text {
		font-size: 30rpx;
		font-weight: 600;
		color: #ffffff;
	}

	.phone-quick-login__tip {
		display: block;
		margin-top: 16rpx;
		text-align: center;
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.45);
		line-height: 1.5;
	}
</style>
