<template>
	<page-meta
		:page-style="pageStyle"
		:navigation-bar-background-color="navBarBg"
		:navigation-bar-text-style="navBarTextStyle"
	/>
</template>

<script setup>
import { computed } from 'vue'
import { buildPageStyle, getNavBarMeta } from '@/utils/theme/theme.js'
import { useTheme } from '@/utils/theme/useTheme.js'

const { currentTheme } = useTheme()

const pageStyle = computed(() => buildPageStyle(currentTheme.value))
const navBarBg = computed(() => getNavBarMeta(currentTheme.value).backgroundColor)
const navBarTextStyle = computed(() => getNavBarMeta(currentTheme.value).textStyle)
</script>
