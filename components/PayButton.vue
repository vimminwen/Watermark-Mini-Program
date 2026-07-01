<template>
	<view class="pay-btn-root" @click="handleClick">
		<slot>
			<view class="subscribe-btn">
				<view class="btn-shine"></view>
				<text class="btn-text">{{ label }}</text>
			</view>
		</slot>
	</view>
</template>

<script setup>
	import {
		request,
		isSilentErrorMessage
	} from '@/utils/request.js';
	import getOpenId from '@/utils/user/wechatAuth.js'

	// 预创建VIP订单接口（与项目统一 request，使用 countdown-day-token）
	const apiAddOrder = (data) => request({
		url: '/pay/preOrder',
		method: 'POST',
		data
	})

	const props = defineProps({
		memberData: {
			type: Object,
			default: () => ({})
		},
		/** 未使用插槽时的默认按钮文案 */
		label: {
			type: String,
			default: '立即开通'
		}
	})

	const emit = defineEmits(['paySuccess', 'payFail', 'payCancel'])

	/** 将后端/微信返回的长错误信息转为用户可读文案 */
	const parsePayErrorMessage = (error) => {
		const raw = String(error?.message || error?.data?.message || '')
		if (isSilentErrorMessage(raw)) return ''
		if (raw.includes('APPID_MCHID_NOT_MATCH') || raw.includes('appid和mch_id不匹配')) {
			return '小程序与微信商户号未绑定，请联系管理员在商户平台完成 AppID 关联'
		}
		const jsonMatch = raw.match(/"message":"([^"\\]+)"/)
		if (jsonMatch?.[1]) {
			return isSilentErrorMessage(jsonMatch[1]) ? '' : jsonMatch[1]
		}
		if (raw.length > 36) return '创建订单失败，请稍后重试'
		return raw || '支付失败，请重试'
	}

	const handleClick = () => {
		// 直接调用支付方法
		handlePay()
	}

	// 支付方法
	const handlePay = async () => {
		const item = props.memberData

		// iOS 禁止支付
		// const systemInfo = uni.getSystemInfoSync();
		// if (systemInfo.platform === 'ios') {
		// 	uni.showToast({
		// 		title: 'iOS系统暂不支持支付，请使用其他设备',
		// 		icon: 'none',
		// 		duration: 3000
		// 	});
		// 	return;
		// }

		if (!item || !item.id) {
			uni.showToast({
				title: '请选择套餐',
				icon: 'none'
			})
			return
		}

		const token = uni.getStorageSync('token')
		if (!token) {
			uni.showModal({
				title: '提示',
				content: '请先登录后再购买会员',
				success: (res) => {
					if (res.confirm) {
						uni.navigateTo({
							url: '/pages/user/login'
						})
					}
				}
			})
			return
		}

		let openId = uni.getStorageSync('openIdStorage')

		if (!openId) {
			try {
				openId = await getOpenId()
				console.log("获取 openId 成功：", openId)
			} catch (err) {
				console.error("获取 openId 失败，终止支付：", err)
				uni.showToast({
					title: "获取授权信息失败，请重试",
					icon: "none"
				})
				return
			}
		}

		processPayment(item)
	}

	// 处理支付流程
	const processPayment = async (item) => {
		uni.showLoading({
			title: '支付处理中...',
			mask: true
		})

		try {
			const userId = uni.getStorageSync("userIdStorage")
			const vipType = item.vipType || 'month'
			const payload = {
				openId: uni.getStorageSync("openIdStorage"),
				description: item.title,
				amount: Number(item.money),
				userId,
				vip: {
					type: vipType,
					model: item.title,
					userId
				}
			}

			// 待支付订单继续支付：传原订单号，避免重复创建
			if (item.reusePendingOrder && (item.orderNo || item.orderId)) {
				if (item.orderNo) payload.orderNo = item.orderNo
				if (item.orderId) {
					payload.orderId = item.orderId
					payload.id = item.orderId
				}
			}

			const res = await apiAddOrder(payload)

			console.log('订单创建响应:', res)

			const body = res?.data
			if (!body) {
				throw new Error('创建订单失败')
			}

			let paymentData = body.data
			// 部分接口直接把支付字段放在根对象
			if (!paymentData && (body.packageVal || body.package || body.paySign)) {
				paymentData = body
			}

			if (typeof paymentData === 'string') {
				try {
					paymentData = JSON.parse(paymentData)
				} catch (e) {
					console.error('解析支付数据失败', e)
					throw new Error('支付参数格式错误')
				}
			}

			if (!paymentData || typeof paymentData !== 'object') {
				throw new Error(body.message || body.msg || '未获取到支付参数，请稍后重试')
			}

			const packageValue = paymentData.packageVal || paymentData.package
			const paySign = paymentData.paySign

			if (!packageValue || !paySign) {
				throw new Error('支付参数不完整')
			}

			uni.requestPayment({
				provider: 'wxpay',
				timeStamp: String(paymentData.timeStamp),
				nonceStr: paymentData.nonceStr,
				package: packageValue,
				signType: paymentData.signType || 'RSA',
				paySign,
				success: () => {
					uni.hideLoading()
					uni.showToast({
						title: '支付成功',
						icon: 'success'
					})
					emit('paySuccess', item)
				},
				fail: (paymentErr) => {
					uni.hideLoading()
					let errorMsg = '支付失败'
					if (paymentErr.errMsg?.includes('cancel')) {
						errorMsg = '用户取消支付'
						emit('payCancel', item)
					} else {
						errorMsg = paymentErr.errMsg || '支付失败'
						emit('payFail', paymentErr)
					}
					uni.showToast({
						title: errorMsg,
						icon: 'none'
					})
				}
			})

		} catch (error) {
			uni.hideLoading()
			console.error('支付流程错误', error)
			const msg = parsePayErrorMessage(error)
			if (msg) {
				if (error?.type === 'BUSINESS_ERROR') {
					uni.showModal({
						title: '支付失败',
						content: msg,
						showCancel: false
					})
				} else {
					uni.showToast({
						title: msg,
						icon: 'none'
					})
				}
			}
			emit('payFail', error)
		}
	}
</script>

<style scoped lang="scss">
	.pay-btn-root {
		flex-shrink: 0;
	}

	.subscribe-btn {
		margin-top: 20rpx;
		background: linear-gradient(135deg, #e8b85a, #c27e2a);
		border-radius: 60rpx;
		padding: 28rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		z-index: 2;
		overflow: hidden;
		box-shadow: 0 16rpx 40rpx rgba(180, 120, 30, 0.5);
		transition: transform 0.2s ease;
	}

	.subscribe-btn:active {
		transform: scale(0.96);
	}

	.btn-shine {
		position: absolute;
		top: -50%;
		left: -50%;
		width: 200%;
		height: 200%;
		background: linear-gradient(45deg,
				transparent 40%,
				rgba(255, 255, 255, 0.2) 50%,
				transparent 60%);
		animation: btnShine 3s infinite;
	}

	@keyframes btnShine {
		0% {
			transform: translateX(-100%) translateY(-100%) rotate(45deg);
		}

		100% {
			transform: translateX(100%) translateY(100%) rotate(45deg);
		}
	}

	.btn-text {
		font-size: 36rpx;
		color: #fff;
		font-weight: 700;
		letter-spacing: 4rpx;
		position: relative;
		z-index: 1;
	}
</style>