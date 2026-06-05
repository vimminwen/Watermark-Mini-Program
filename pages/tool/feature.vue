<template>
	<dark-page-meta />
	<view class="feature-page" :class="themeClass">
		<ToolBackendRequired
			:title="toolTitle"
			:description="toolDesc"
			:message="backendMessage"
		/>
		<tool-tips-card v-if="tips.length" :tips="tips" />
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { usePageTheme } from '@/utils/theme/useTheme.js'

	const { themeClass } = usePageTheme()
	import { ref } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import ToolBackendRequired from '@/components/common/ToolBackendRequired.vue'
	import { getToolById, BACKEND_REQUIRED_MESSAGE } from '@/utils/tool/toolRegistry.js'

	const toolTitle = ref('功能')
	const toolDesc = ref('')
	const backendMessage = BACKEND_REQUIRED_MESSAGE

	const tips = [
		'此类能力需上传图片/视频至服务端处理',
		'涉及模型推理，无法在小程序内离线完成',
		'后续接入接口后将在此页直接提供处理入口'
	]

	onLoad((options) => {
		const meta = getToolById(options?.id)
		if (meta) {
			toolTitle.value = meta.title || toolTitle.value
			toolDesc.value = meta.content || ''
		} else if (options?.title) {
			toolTitle.value = decodeURIComponent(options.title)
		}

		uni.setNavigationBarTitle({
			title: toolTitle.value
		})
	})
</script>

<style lang="scss" scoped>
	.feature-page {
		min-height: 100vh;
		padding: 30rpx;
		padding-bottom: 140rpx;
		box-sizing: border-box;
		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));
	}
</style>
