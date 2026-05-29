/** 解析支付记录列表接口响应 */
export const parsePayHistoryList = (res) => {
	const body = res?.data
	if (!body) return []

	const isOk =
		body.success === true ||
		body.code === 'success' ||
		String(body.code) === '200' ||
		Array.isArray(body.data) ||
		Array.isArray(body.list) ||
		Array.isArray(body.records)

	if (!isOk && body.code != null && body.success !== true) {
		return []
	}

	let list = body.data ?? body.list ?? body.records ?? body
	if (list && typeof list === 'object' && !Array.isArray(list)) {
		list = list.records ?? list.list ?? list.items ?? list.rows ?? []
	}
	if (!Array.isArray(list)) return []

	return list.map(normalizePayOrder).filter(Boolean)
}

const formatOrderTime = (value) => {
	if (value == null || value === '') return '--'
	const num = Number(value)
	if (!Number.isNaN(num) && num > 1e12) {
		return formatDate(new Date(num))
	}
	if (!Number.isNaN(num) && num > 1e9) {
		return formatDate(new Date(num * 1000))
	}
	let str = String(value).trim()
	if (/\+0000$/.test(str)) str = str.replace(/\+0000$/, 'Z')
	else str = str.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
	const ts = new Date(str).getTime()
	if (Number.isNaN(ts)) return String(value)
	return formatDate(new Date(ts))
}

const formatDate = (d) => {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	const h = String(d.getHours()).padStart(2, '0')
	const min = String(d.getMinutes()).padStart(2, '0')
	const s = String(d.getSeconds()).padStart(2, '0')
	return `${y}-${m}-${day} ${h}:${min}:${s}`
}

const formatAmount = (value) => {
	const n = Number(value)
	if (Number.isNaN(n)) return '0.00'
	// 接口 amount 为元（如 0.01、49.9）；仅当明显为分时才换算
	if (Number.isInteger(n) && n >= 1000) {
		return (n / 100).toFixed(2)
	}
	return n.toFixed(2)
}

/** 后端 orderStatus → 页面状态 pending | success | refunded | closed */
export const mapPayOrderStatus = (orderStatus, options = {}) => {
	const { successTime } = options
	if (successTime) return 'success'

	const s = String(orderStatus ?? '').trim()
	if (!s) return 'pending'

	if (/退款|REFUND/i.test(s)) return 'refunded'
	if (/关闭|取消|CLOSED|CANCEL|REVOKED/i.test(s)) return 'closed'
	if (/待支付|未支付|PENDING|NOTPAY|WAIT|UNPAID|USERPAYING/i.test(s)) return 'pending'
	if (/已支付|支付成功|已完成|SUCCESS|PAID|COMPLETE|TRADE_SUCCESS|FINISHED/i.test(s)) return 'success'

	if (s === '0') return 'pending'
	if (s === '1' || s === '2') return s === '2' ? 'refunded' : 'success'

	return 'pending'
}

const normalizePayOrder = (raw) => {
	if (!raw || typeof raw !== 'object') return null

	// 展示商户订单号 orderNo，内部 id 仅作 key 备用
	const orderNo = raw.orderNo ?? raw.outTradeNo ?? raw.orderId ?? raw.tradeNo
	if (!orderNo && raw.id == null && !raw.description && raw.amount == null) return null

	const vip = raw.vip && typeof raw.vip === 'object' ? raw.vip : null
	const title =
		raw.description ??
		vip?.model ??
		raw.title ??
		raw.subject ??
		'会员订单'

	let type = raw.orderType ?? raw.bizType
	if (type != null && typeof type === 'object') {
		type = type.name ?? type.label ?? '会员充值'
	}
	type = String(type ?? '').trim()
	if (!type) {
		type = /退/.test(String(raw.orderStatus ?? title)) ? '会员退款' : '会员充值'
	}

	const status = mapPayOrderStatus(raw.orderStatus ?? raw.payStatus ?? raw.tradeState, {
		successTime: raw.successTime
	})

	const payTime = raw.successTime ?? raw.payTime ?? raw.createTime

	return {
		id: String(orderNo ?? raw.id ?? ''),
		title: String(title),
		type,
		amount: formatAmount(raw.amount ?? raw.money ?? raw.totalAmount ?? raw.payAmount),
		time: formatOrderTime(payTime ?? raw.updateTime ?? raw.createdAt ?? raw.gmtCreate),
		status,
		orderStatusText: String(raw.orderStatus ?? '').trim(),
		vipType: vip?.type ? String(vip.type) : '',
		internalOrderId: raw.id != null ? String(raw.id) : ''
	}
}
