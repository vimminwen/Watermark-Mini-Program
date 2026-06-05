<template>
	<dark-page-meta />
	<media-text-extract-panel mode="audio" />
	<safe-area-bottom />
</template>

<script setup>
	import { usePageTheme } from '@/utils/theme/useTheme.js'
	import { onLoad } from '@dcloudio/uni-app'
	import MediaTextExtractPanel from '@/components/tool/MediaTextExtractPanel.vue'

	usePageTheme()

	onLoad((options) => {
		const title = options?.title
			? decodeURIComponent(options.title)
			: '音频转文字'
		uni.setNavigationBarTitle({ title })
	})
</script>
