import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
	THEME_DARK,
	THEME_LIGHT,
	getStoredTheme,
	applyTheme as applyThemeNative,
	applyNavigationTheme,
	applyTabBarTheme,
	applyPageBackgroundTheme,
	normalizeTheme
} from '@/utils/theme/theme.js'

const currentTheme = ref(getStoredTheme())

export function refreshThemeFromStorage() {
	currentTheme.value = getStoredTheme()
	return currentTheme.value
}

function syncNativeChrome(theme = currentTheme.value) {
	applyNavigationTheme(theme)
	applyTabBarTheme(theme)
	applyPageBackgroundTheme(theme)
}

export function useTheme() {
	const isDark = computed(() => currentTheme.value === THEME_DARK)
	const isLight = computed(() => currentTheme.value === THEME_LIGHT)
	const themeClass = computed(() => `theme-${currentTheme.value}`)

	const setThemeMode = (theme) => {
		const normalized = normalizeTheme(theme)
		currentTheme.value = normalized
		applyThemeNative(normalized)
	}

	const toggleTheme = () => {
		setThemeMode(isDark.value ? THEME_LIGHT : THEME_DARK)
	}

	return {
		currentTheme,
		isDark,
		isLight,
		themeClass,
		setThemeMode,
		toggleTheme,
		refreshThemeFromStorage
	}
}

/** 在页面 setup 中调用一次，同步导航栏 / TabBar / 窗口背景 */
export function usePageTheme() {
	const theme = useTheme()

	onShow(() => {
		refreshThemeFromStorage()
		syncNativeChrome()
	})

	watch(currentTheme, (value) => {
		syncNativeChrome(value)
	})

	return theme
}
