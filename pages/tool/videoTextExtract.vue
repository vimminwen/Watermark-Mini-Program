<template>
	<dark-page-meta />
	<media-text-extract-panel mode="video" />
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
			: '视频转文字'
		uni.setNavigationBarTitle({ title })
	})
</script>
