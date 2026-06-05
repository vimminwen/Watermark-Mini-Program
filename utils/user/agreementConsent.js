import { ref } from 'vue'

/** 登录/注册页用户协议勾选与弹窗确认 */
export const useAgreementConsent = () => {
	const agreedToTerms = ref(false)

	const toggleAgreed = () => {
		agreedToTerms.value = !agreedToTerms.value
	}

	const ensureAgreed = (onConfirm) => {
		if (agreedToTerms.value) {
			onConfirm?.()
			return
		}

		uni.showModal({
			title: '温馨提示',
			content: '请先阅读并同意《用户协议》和《隐私政策》',
			confirmText: '同意',
			cancelText: '取消',
			success: (res) => {
				if (res.confirm) {
					agreedToTerms.value = true
					onConfirm?.()
				}
			}
		})
	}

	return {
		agreedToTerms,
		toggleAgreed,
		ensureAgreed
	}
}
