export const THEME_STORAGE_KEY = 'app_theme'
export const THEME_DARK = 'dark'
export const THEME_LIGHT = 'light'

const DARK_VARS = {
	'--page-bg-start': '#050d40',
	'--page-bg-end': '#233968',
	'--page-bg-color': '#050d40',
	'--text-primary': '#ffffff',
	'--text-secondary': 'rgba(255, 255, 255, 0.7)',
	'--text-muted': 'rgba(255, 255, 255, 0.5)',
	'--text-faint': 'rgba(255, 255, 255, 0.4)',
	'--text-subtle': 'rgba(255, 255, 255, 0.6)',
	'--text-soft': 'rgba(255, 255, 255, 0.8)',
	'--text-dim': 'rgba(255, 255, 255, 0.9)',
	'--card-bg': 'rgba(0, 0, 0, 0.4)',
	'--surface-bg': 'rgba(255, 255, 255, 0.1)',
	'--surface-bg-light': 'rgba(255, 255, 255, 0.05)',
	'--surface-bg-strong': 'rgba(255, 255, 255, 0.2)',
	'--border-color': 'rgba(255, 255, 255, 0.1)',
	'--nav-bar-bg': '#050d40',
	'--tab-bar-bg': '#233968',
	'--tab-bar-color': '#999999',
	'--tab-bar-selected': '#ffffff',
	'--safe-area-bg': '#233968',
	'--nav-text-style': 'white'
}

const LIGHT_VARS = {
	'--page-bg-start': '#f5f7fb',
	'--page-bg-end': '#e8edf5',
	'--page-bg-color': '#ffffff',
	'--text-primary': '#1a1a2e',
	'--text-secondary': 'rgba(26, 26, 46, 0.72)',
	'--text-muted': 'rgba(26, 26, 46, 0.5)',
	'--text-faint': 'rgba(26, 26, 46, 0.4)',
	'--text-subtle': 'rgba(26, 26, 46, 0.6)',
	'--text-soft': 'rgba(26, 26, 46, 0.82)',
	'--text-dim': 'rgba(26, 26, 46, 0.92)',
	'--card-bg': 'rgba(255, 255, 255, 0.92)',
	'--surface-bg': 'rgba(0, 0, 0, 0.05)',
	'--surface-bg-light': 'rgba(0, 0, 0, 0.03)',
	'--surface-bg-strong': 'rgba(0, 0, 0, 0.08)',
	'--border-color': 'rgba(0, 0, 0, 0.08)',
	'--nav-bar-bg': '#ffffff',
	'--tab-bar-bg': '#ffffff',
	'--tab-bar-color': '#999999',
	'--tab-bar-selected': '#233968',
	'--safe-area-bg': '#ffffff',
	'--nav-text-style': 'black'
}

export const THEME_VARS = {
	[THEME_DARK]: DARK_VARS,
	[THEME_LIGHT]: LIGHT_VARS
}

export function normalizeTheme(theme) {
	return theme === THEME_LIGHT ? THEME_LIGHT : THEME_DARK
}

export function getStoredTheme() {
	try {
		return normalizeTheme(uni.getStorageSync(THEME_STORAGE_KEY))
	} catch (e) {
		return THEME_DARK
	}
}

export function buildPageStyle(theme) {
	const vars = THEME_VARS[normalizeTheme(theme)] || DARK_VARS
	const parts = Object.entries(vars).map(([key, value]) => `${key}:${value}`)
	parts.push(`background:linear-gradient(to bottom, ${vars['--page-bg-start']}, ${vars['--page-bg-end']})`)
	parts.push(`color:${vars['--text-primary']}`)
	return `${parts.join(';')};`
}

export function getNavBarMeta(theme) {
	const vars = THEME_VARS[normalizeTheme(theme)] || DARK_VARS
	return {
		backgroundColor: vars['--nav-bar-bg'],
		textStyle: vars['--nav-text-style']
	}
}

export function applyNavigationTheme(theme) {
	const { backgroundColor, textStyle } = getNavBarMeta(theme)
	const frontColor = textStyle === 'black' ? '#000000' : '#ffffff'
	try {
		uni.setNavigationBarColor({
			frontColor,
			backgroundColor,
			animation: { duration: 200, timingFunc: 'easeIn' }
		})
	} catch (e) {
		console.warn('[applyNavigationTheme]', e)
	}
}

export function applyTabBarTheme(theme) {
	const vars = THEME_VARS[normalizeTheme(theme)] || DARK_VARS
	uni.setTabBarStyle({
		color: vars['--tab-bar-color'],
		selectedColor: vars['--tab-bar-selected'],
		backgroundColor: vars['--tab-bar-bg'],
		borderStyle: normalizeTheme(theme) === THEME_LIGHT ? 'white' : 'black',
		fail: () => {}
	})
}

export function applyPageBackgroundTheme(theme) {
	const vars = THEME_VARS[normalizeTheme(theme)] || DARK_VARS
	if (typeof uni.setBackgroundColor !== 'function') return
	try {
		uni.setBackgroundColor({
			backgroundColor: vars['--page-bg-end'],
			backgroundColorTop: vars['--page-bg-start'],
			backgroundColorBottom: vars['--page-bg-end']
		})
	} catch (e) {
		console.warn('[applyPageBackgroundTheme]', e)
	}
}

export function applyTheme(theme) {
	const normalized = normalizeTheme(theme)
	try {
		uni.setStorageSync(THEME_STORAGE_KEY, normalized)
	} catch (e) {
		console.warn('[applyTheme] storage', e)
	}
	applyNavigationTheme(normalized)
	applyTabBarTheme(normalized)
	applyPageBackgroundTheme(normalized)
	return normalized
}
