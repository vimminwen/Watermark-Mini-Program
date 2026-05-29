const DEFAULT_BENEFITS = ['全部工具解锁', '无广告干扰', '云端存储']

const formatPrice = (value) => {
	const n = Number(value)
	if (Number.isNaN(n)) return '0.00'
	if (Number.isInteger(n) && n >= 1000) return (n / 100).toFixed(2)
	return n.toFixed(2)
}

/** code / durationDays → 展示单位 */
const mapUnitLabel = (code, durationDays) => {
	const days = Number(durationDays)
	if (days === 30) return '月'
	if (days === 90) return '季'
	if (days >= 365) return '年'

	const t = String(code ?? '').toLowerCase()
	if (t === 'month') return '月'
	if (t === 'season' || t === 'quarter') return '季'
	if (t === 'year') return '年'
	if (t.includes('季')) return '季'
	if (t.includes('年')) return '年'
	return '月'
}

/** 支付 /vip 使用的 type，与接口 code 对齐 */
const mapVipType = (code, name = '') => {
	const c = String(code ?? '').trim().toLowerCase()
	if (c === 'month' || c === 'season' || c === 'year') return c
	if (c === 'quarter') return 'season'

	const label = `${code ?? ''} ${name}`.toLowerCase()
	if (label.includes('season') || label.includes('quarter') || label.includes('季')) {
		return 'season'
	}
	if (label.includes('year') || label.includes('年')) return 'year'
	return 'month'
}

const parseBenefits = (raw) => {
	if (Array.isArray(raw)) {
		return raw
			.map(item => {
				if (typeof item === 'string') return item.trim()
				if (item && typeof item === 'object') {
					return String(item.name ?? item.title ?? item.label ?? '').trim()
				}
				return ''
			})
			.filter(Boolean)
	}
	if (typeof raw === 'string' && raw.trim()) {
		return raw.split(/[,，;；|]/).map(s => s.trim()).filter(Boolean)
	}
	return []
}

const normalizePackage = (raw, index) => {
	if (!raw || typeof raw !== 'object') return null

	const id = raw.id ?? raw.packageId
	const name = raw.name ?? raw.packageName ?? raw.title
	if (id == null && !name) return null

	const code = raw.code ?? raw.type ?? raw.vipType ?? ''
	const durationDays = raw.durationDays ?? raw.duration
	const priceRaw = raw.price ?? raw.amount ?? raw.money ?? 0
	const originalRaw = raw.originalPrice ?? raw.originPrice ?? raw.linePrice
	const badgeText = raw.badgeText ? String(raw.badgeText).trim() : ''
	const benefits = parseBenefits(raw.benefits ?? raw.benefitList ?? raw.features)

	return {
		id: id ?? index + 1,
		name: String(name || `会员套餐${index + 1}`),
		code: String(code || '').toLowerCase(),
		price: formatPrice(priceRaw),
		originalPrice:
			originalRaw != null && Number(originalRaw) > Number(priceRaw)
				? formatPrice(originalRaw)
				: '',
		unit: mapUnitLabel(code, durationDays),
		durationDays: Number(durationDays) || 0,
		vipType: mapVipType(code, name),
		desc: String(raw.description ?? raw.desc ?? raw.remark ?? '').trim(),
		badgeText,
		hot: !!badgeText,
		benefits: benefits.length ? benefits : [...DEFAULT_BENEFITS],
		sort: Number(raw.sortOrder ?? raw.sort ?? raw.order ?? index)
	}
}

/** 解析 /front/member-package/list 响应 */
export const parseMemberPackageList = (res) => {
	const body = res?.data
	if (!body) return []

	const isOk =
		body.success === true ||
		body.code === 'success' ||
		String(body.code) === '200' ||
		Array.isArray(body.data) ||
		Array.isArray(body.list)

	if (!isOk && body.code != null && body.success !== true) {
		return []
	}

	let list = body.data ?? body.list ?? body.records ?? body
	if (list && typeof list === 'object' && !Array.isArray(list)) {
		list = list.records ?? list.list ?? list.items ?? []
	}
	if (!Array.isArray(list)) return []

	return list
		.filter(raw => {
			const status = String(raw.status ?? '').toUpperCase()
			return status === 'ENABLE' || status === '' || status === '1'
		})
		.map((item, index) => normalizePackage(item, index))
		.filter(Boolean)
		.sort((a, b) => a.sort - b.sort)
		.map(({ sort, ...rest }) => rest)
}
