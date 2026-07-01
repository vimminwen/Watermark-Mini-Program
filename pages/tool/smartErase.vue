<template>

	<dark-page-meta />

	<view class="erase-page" :class="themeClass">

		<view class="preview-card boxBg">

			<view v-if="!imagePath" class="preview-empty" @tap="chooseImage">

				<text class="iconfont icon-shengchengAI3 empty-icon"></text>

				<text class="empty-title">点击选择图片</text>

				<text class="empty-desc">支持 JPG / PNG，建议小于 5MB</text>

			</view>

			<template v-else>

				<view class="erase-stage" id="eraseStage">

					<image

						class="stage-image"

						:src="displayImage"

						mode="aspectFit"

						@load="onImageLoad"

						@tap="onPreviewTap"

					/>

					<view

						v-if="stageReady && !resultPath"

						class="mask-layer"

						:style="maskLayerStyle"

						@touchstart.stop="onMaskTouchStart"

						@touchmove.stop.prevent="onMaskTouchMove"

						@touchend.stop="onMaskTouchEnd"

						@touchcancel.stop="onMaskTouchEnd"

					>

						<canvas

							type="2d"

							id="maskCanvas"

							class="mask-canvas"

							:style="maskCanvasStyle"

							:disable-scroll="true"

						/>

					</view>

					<view v-if="resultPath" class="size-badge size-badge-pass">

						<text>消除完成 · 点击预览</text>

					</view>

				</view>

				<view
					v-if="stageReady && !resultPath"
					class="stage-hint-bar"
					:style="stageHintStyle"
				>

					<text>涂抹要消除的区域，可多次涂抹</text>

				</view>

			</template>

		</view>



		<view class="toolbar">

			<view class="tool-chip" @tap="chooseImage">

				<text>{{ imagePath ? ' 换一张' : ' 选择图片' }}</text>

			</view>

			<view v-if="imagePath && !resultPath" class="tool-chip" @tap="undoMask">

				<text>↩ 撤销</text>

			</view>

			<view v-if="imagePath" class="tool-chip danger" @tap="resetAll">

				<text>清空</text>

			</view>

		</view>



		<view v-if="imagePath && stageReady && !resultPath" class="param-panel boxBg">

			<view class="section-label">

				<view class="label-line"></view>

				<text>笔刷大小</text>

			</view>

			<view class="panel-row">

				<slider

					class="panel-slider"

					:value="brushSize"

					:min="12"

					:max="72"

					:step="2"

					activeColor="#4facfe"

					backgroundColor="rgba(255,255,255,0.15)"

					block-color="#00f2fe"

					@changing="onBrushChange"

					@change="onBrushChange"

				/>

				<text class="panel-value">{{ brushSize }}</text>

			</view>

		</view>



		<view v-if="imagePath && stageReady" class="settings-panel boxBg">

			<view

				class="process-btn"

				:class="{ disabled: processing }"

				@tap="onProcessTap"

			>

				<processing-text

					:active="processing"

					text="消除中"

					:idle-text="resultPath ? '重新消除' : '开始消除'"

				/>

			</view>

			<view

				v-if="resultPath"

				class="save-btn"

				:class="{ disabled: saving }"

				@tap="saveImage"

			>

				<text>{{ saving ? '保存中...' : '保存到相册' }}</text>

			</view>

		</view>



		<tool-tips-card :tips="tips" />

	</view>



	<!-- 离屏导出蒙版 -->

	<canvas

		v-if="originSize.width && originSize.height"

		type="2d"

		id="exportMaskCanvas"

		class="export-mask-canvas"

		:style="exportCanvasStyle"

		:disable-scroll="true"

	/>



	<safe-area-bottom />

</template>



<script setup>

	import { usePageTheme } from '@/utils/theme/useTheme.js'



	const { themeClass } = usePageTheme()

	import { ref, computed, getCurrentInstance, nextTick } from 'vue'

	import { onLoad } from '@dcloudio/uni-app'

	import { apiSmartErase, apiGetAiLog } from '@/api/api.js'

	import { isApiSuccess, getApiMessage } from '@/utils/user/authHelper.js'

	import { checkLogin, beforeUploadCheck, recordTrialUseAfterSuccess } from '@/utils/user/auth.js'

	import { uploadImageToOss } from '@/utils/image/ossUpload.js'

	import { extractAiLogId, pollAiLogResult, resolveAiLogResultUrl } from '@/utils/ai/aiLog.js'

	import { calcAspectFitRect } from '@/utils/image/imageCrop.js'

	import {

		buildSmartErasePayload,

		appendMaskStrokePoint,

		drawMaskPreview,

		drawMaskExport,

		displayToOriginPoint,

		hasMaskStrokes,

		cloneMaskStrokeSegments

	} from '@/utils/image/smartErase.js'

	import { useDebugLog, showTaskLoading, hideTaskLoading } from '@/utils/debug/useDebugLog.js'

	import { baseUrl } from '@/utils/http.js'



	const {

		clearDebugLogs,

		logInfo,

		logStep,

		logOk,

		showDebugError

	} = useDebugLog('smartErase')



	const instance = getCurrentInstance()



	const imagePath = ref('')

	const resultPath = ref('')

	const processing = ref(false)

	const saving = ref(false)

	const originSize = ref({ width: 0, height: 0 })

	const displayRect = ref({ x: 0, y: 0, w: 0, h: 0 })

	const stageReady = ref(false)

	const brushSize = ref(28)

	const maskStrokes = ref([])

	const maskHistory = ref([])



	let maskCanvasNode = null

	let maskCtx = null

	let isDrawing = false

	let maskLayerRect = { left: 0, top: 0, width: 0, height: 0 }



	const displayImage = computed(() => resultPath.value || imagePath.value)



	const maskLayerStyle = computed(() => {

		const d = displayRect.value

		if (!d.w || !d.h) return { display: 'none' }

		return {

			left: `${d.x}px`,

			top: `${d.y}px`,

			width: `${d.w}px`,

			height: `${d.h}px`

		}

	})



	const maskCanvasStyle = computed(() => {

		const d = displayRect.value

		if (!d.w || !d.h) return {}

		return {

			width: `${d.w}px`,

			height: `${d.h}px`

		}

	})



	const stageHintStyle = computed(() => {

		const d = displayRect.value

		if (!d.w || !d.h) return {}

		return {

			width: `${d.w}px`,

			marginLeft: `${d.x}px`

		}

	})



	const exportCanvasStyle = computed(() => {

		const w = originSize.value.width

		const h = originSize.value.height

		return {

			width: `${w}px`,

			height: `${h}px`

		}

	})



	const tips = [

		'选择图片后，用手指涂抹要消除的区域，可多次涂抹',

		'支持水印、路人、文字等局部消除',

		'可调整笔刷大小，撤销或清空后重新涂抹',

		'满意后保存到相册'

	]



	onLoad((options) => {

		if (options?.title) {

			uni.setNavigationBarTitle({ title: decodeURIComponent(options.title) })

		}

	})



	const loadImageMeta = (path, callback) => {

		uni.getImageInfo({

			src: path,

			success: (info) => {

				originSize.value = {

					width: info.width,

					height: info.height

				}

				callback?.()

			}

		})

	}



	const measureStage = () => {

		const query = uni.createSelectorQuery()

		const scope = instance?.proxy ?? instance

		if (scope) query.in(scope)

		query

			.select('#eraseStage')

			.boundingClientRect((rect) => {

				if (!rect?.width || !rect?.height) return

				const w = originSize.value.width

				const h = originSize.value.height

				if (!w || !h) return

				displayRect.value = calcAspectFitRect(rect.width, rect.height, w, h)

				stageReady.value = true

				nextTick(() => {

					nextTick(() => initMaskCanvas())

				})

			})

			.exec()

	}



	const refreshMaskLayerRect = () =>

		new Promise((resolve) => {

			const query = uni.createSelectorQuery()

			const scope = instance?.proxy ?? instance

			if (scope) query.in(scope)

			query

				.select('.mask-layer')

				.boundingClientRect((rect) => {

					if (rect?.width) {

						maskLayerRect = {

							left: rect.left,

							top: rect.top,

							width: rect.width,

							height: rect.height

						}

					}

					resolve(rect)

				})

				.exec()

		})



	const initMaskCanvas = (retry = 0) => {

		const d = displayRect.value

		if (!d.w || !d.h) return



		const query = uni.createSelectorQuery()

		const scope = instance?.proxy ?? instance

		if (scope) query.in(scope)

		query

			.select('#maskCanvas')

			.fields({ node: true, size: true })

			.exec(async (res) => {

				const canvas = res?.[0]?.node

				if (!canvas) {

					if (retry < 3) {

						setTimeout(() => initMaskCanvas(retry + 1), 80)

					}

					return

				}

				await refreshMaskLayerRect()

				maskCanvasNode = canvas

				maskCtx = canvas.getContext('2d')

				const cw = Math.max(1, Math.round(res?.[0]?.width || d.w))

				const ch = Math.max(1, Math.round(res?.[0]?.height || d.h))

				canvas.width = cw

				canvas.height = ch

				redrawMaskPreview()

			})

	}



	const redrawMaskPreview = () => {

		if (!maskCtx || !maskCanvasNode) return

		const cw = maskCanvasNode.width

		const ch = maskCanvasNode.height

		drawMaskPreview(

			maskCtx,

			maskStrokes.value,

			{ w: cw, h: ch },

			originSize.value

		)

	}



	const getMaskTouchPoint = (touch) => {

		if (!touch) return null

		const d = displayRect.value

		if (!d.w || !d.h) return null



		if (touch.x != null && touch.y != null) {

			return {

				x: Math.max(0, Math.min(d.w, Number(touch.x))),

				y: Math.max(0, Math.min(d.h, Number(touch.y)))

			}

		}



		if (touch.clientX != null && touch.clientY != null && maskLayerRect.width) {

			return {

				x: Math.max(0, Math.min(d.w, touch.clientX - maskLayerRect.left)),

				y: Math.max(0, Math.min(d.h, touch.clientY - maskLayerRect.top))

			}

		}



		return null

	}



	const pushMaskHistory = () => {

		maskHistory.value.push(cloneMaskStrokeSegments(maskStrokes.value))

		if (maskHistory.value.length > 30) {

			maskHistory.value.shift()

		}

	}



	const onMaskTouchStart = async (e) => {

		if (!maskCtx) {

			initMaskCanvas()

		}

		await refreshMaskLayerRect()

		const touch = e.touches?.[0]

		const local = getMaskTouchPoint(touch)

		if (!local || !displayRect.value.w) return

		const origin = displayToOriginPoint(

			local.x,

			local.y,

			displayRect.value,

			originSize.value

		)

		if (!origin) return

		pushMaskHistory()

		isDrawing = true

		maskStrokes.value.push([])

		const segment = maskStrokes.value[maskStrokes.value.length - 1]

		appendMaskStrokePoint(segment, origin.x, origin.y, brushSize.value)

		redrawMaskPreview()

	}



	const onMaskTouchMove = (e) => {

		if (!isDrawing) return

		const segment = maskStrokes.value[maskStrokes.value.length - 1]

		if (!segment) return

		const touch = e.touches?.[0]

		const local = getMaskTouchPoint(touch)

		if (!local) return

		const origin = displayToOriginPoint(

			local.x,

			local.y,

			displayRect.value,

			originSize.value

		)

		if (!origin) return

		if (appendMaskStrokePoint(segment, origin.x, origin.y, brushSize.value)) {

			redrawMaskPreview()

		}

	}



	const onMaskTouchEnd = () => {

		isDrawing = false

	}



	const onBrushChange = (e) => {

		brushSize.value = Math.round(Number(e.detail.value) || 28)

	}



	const undoMask = () => {

		if (!maskHistory.value.length) {

			maskStrokes.value = []

		} else {

			maskStrokes.value = maskHistory.value.pop()

		}

		redrawMaskPreview()

	}



	const chooseImage = async () => {
		if (!(await beforeUploadCheck())) return

		uni.chooseImage({

			count: 1,

			sizeType: ['compressed', 'original'],

			sourceType: ['album', 'camera'],

			success: (res) => {

				const path = res.tempFilePaths?.[0]

				if (!path) return

				const size = res.tempFiles?.[0]?.size

				if (size && size > 5 * 1024 * 1024) {

					uni.showToast({ title: '图片请小于 5MB', icon: 'none' })

					return

				}

				resetAll(false)

				imagePath.value = path

				loadImageMeta(path, () => nextTick(() => measureStage()))

			},

			fail: (err) => {

				if (/cancel|取消/.test(err?.errMsg || '')) return

				uni.showToast({ title: '选择图片失败', icon: 'none' })

			}

		})

	}



	const resetAll = (clearImage = true) => {

		isDrawing = false

		maskCanvasNode = null

		maskCtx = null

		if (clearImage) {

			imagePath.value = ''

			originSize.value = { width: 0, height: 0 }

			stageReady.value = false

			displayRect.value = { x: 0, y: 0, w: 0, h: 0 }

		}

		resultPath.value = ''

		maskStrokes.value = []

		maskHistory.value = []

	}



	const onImageLoad = () => {

		if (resultPath.value) return

		nextTick(() => measureStage())

	}



	const exportMaskToTemp = () =>

		new Promise((resolve, reject) => {

			const w = originSize.value.width

			const h = originSize.value.height

			if (!w || !h) {

				reject(new Error('图片尺寸无效'))

				return

			}



			const query = uni.createSelectorQuery()

			const scope = instance?.proxy ?? instance

			if (scope) query.in(scope)

			query

				.select('#exportMaskCanvas')

				.fields({ node: true, size: true })

				.exec((res) => {

					const canvas = res?.[0]?.node

					if (!canvas) {

						reject(new Error('蒙版画布初始化失败'))

						return

					}

					canvas.width = w

					canvas.height = h

					const ctx = canvas.getContext('2d')

					drawMaskExport(ctx, maskStrokes.value, originSize.value)



					const exportScope = instance?.proxy ?? instance

					uni.canvasToTempFilePath(

						{

							canvas,

							fileType: 'png',

							quality: 1,

							success: (r) => resolve(r.tempFilePath),

							fail: () => reject(new Error('蒙版导出失败'))

						},

						exportScope

					)

				})

		})



	const downloadResultImage = (url) =>

		new Promise((resolve, reject) => {

			uni.downloadFile({

				url,

				success: (res) => {

					if (res.statusCode === 200 && res.tempFilePath) {

						resolve(res.tempFilePath)

					} else {

						reject(new Error('下载结果失败'))

					}

				},

				fail: reject

			})

		})



	const onPreviewTap = () => {

		if (!resultPath.value) return

		uni.previewImage({

			urls: [resultPath.value],

			current: resultPath.value

		})

	}



	const onProcessTap = () => {

		if (processing.value) return

		if (resultPath.value) {

			resultPath.value = ''

			nextTick(() => initMaskCanvas())

			return

		}

		handleErase()

	}



	const handleErase = async () => {

		if (processing.value || !imagePath.value || !stageReady.value) return

		if (!checkLogin()) return

		if (!hasMaskStrokes(maskStrokes.value)) {

			uni.showToast({ title: '请先涂抹要消除的区域', icon: 'none' })

			return

		}



		processing.value = true

		logInfo(`API 根地址: ${baseUrl}`)

		logStep('1/5 导出涂抹蒙版')

		showTaskLoading({ title: '准备蒙版...', mask: true })



		try {

			const maskPath = await exportMaskToTemp()

			logOk('蒙版导出成功')

			logStep('2/5 上传原图到 OSS')

			showTaskLoading({ title: '上传图片...', mask: true })



			const ossUrl = await uploadImageToOss(imagePath.value)

			logOk(`原图上传成功\n${ossUrl}`)

			logStep('3/5 上传蒙版到 OSS')

			showTaskLoading({ title: '上传蒙版...', mask: true })



			const maskUrl = await uploadImageToOss(maskPath)

			logOk(`蒙版上传成功\n${maskUrl}`)

			logStep('4/5 提交消除任务')

			showTaskLoading({ title: '消除中...', mask: true })



			const payload = buildSmartErasePayload(ossUrl, maskUrl)

			const res = await apiSmartErase(payload)

			const body = res?.data

			if (!isApiSuccess(body)) {

				throw new Error(getApiMessage(body, '消除失败'))

			}



			let resultUrl = resolveAiLogResultUrl(body)



			if (!resultUrl) {

				const aiLogId = extractAiLogId(body)

				if (!aiLogId) {

					throw new Error('未获取到任务 ID')

				}

				logStep(`轮询任务结果 (id=${aiLogId})`)

				resultUrl = await pollAiLogResult(apiGetAiLog, aiLogId, {

					onProgress: (attempt, maxAttempts) => {

						logInfo(`轮询中: ${attempt}/${maxAttempts}`)

						showTaskLoading({ title: '消除中...', mask: true })

					}

				})

				logOk(`任务完成\n${resultUrl}`)

			} else {

				logOk(`同步返回结果\n${resultUrl}`)

			}



			logStep('5/5 下载结果')

			showTaskLoading({ title: '下载结果...', mask: true })

			const localPath = await downloadResultImage(resultUrl)

			resultPath.value = localPath

			logOk('消除完成')
			recordTrialUseAfterSuccess()

			uni.showToast({ title: '消除完成', icon: 'success' })

		} catch (err) {

			console.error('[handleErase]', err)

			showDebugError('消除失败', err)

		} finally {

			processing.value = false

			hideTaskLoading()

		}

	}



	const saveImage = () => {

		if (saving.value || !resultPath.value) return

		saving.value = true

		uni.saveImageToPhotosAlbum({

			filePath: resultPath.value,

			success: () => {

				uni.showToast({ title: '已保存到相册', icon: 'success' })

			},

			fail: (err) => {

				console.error('[saveImage]', err)

				const denied = /auth deny|authorize|permission/i.test(err?.errMsg || '')

				if (denied) {

					uni.showModal({

						title: '需要相册权限',

						content: '请在设置中允许保存到相册',

						confirmText: '去设置',

						success: (res) => {

							if (res.confirm) uni.openSetting()

						}

					})

				} else {

					uni.showToast({ title: '保存失败', icon: 'none' })

				}

			},

			complete: () => {

				saving.value = false

			}

		})

	}

</script>



<style lang="scss" scoped>

	.erase-page {

		min-height: 100vh;

		padding: 30rpx;

		padding-bottom: 140rpx;

		box-sizing: border-box;

		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));

	}



	.preview-card {

		border-radius: 20rpx;

		overflow: hidden;

		margin-bottom: 24rpx;

		min-height: 480rpx;

	}



	.preview-empty {

		display: flex;

		flex-direction: column;

		align-items: center;

		justify-content: center;

		min-height: 480rpx;

		padding: 80rpx 40rpx;



		&:active {

			opacity: 0.85;

		}



		.empty-icon {

			font-size: 88rpx;

			margin-bottom: 24rpx;

			background: linear-gradient(to bottom, #aa2267, #fe764e);

			-webkit-background-clip: text;

			-webkit-text-fill-color: transparent;

			background-clip: text;

		}



		.empty-title {

			font-size: 32rpx;

			color: var(--text-primary);

			margin-bottom: 12rpx;

		}



		.empty-desc {

			font-size: 26rpx;

			color: var(--text-muted);

		}

	}



	.erase-stage {

		position: relative;

		width: 100%;

		height: 480rpx;

		overflow: hidden;

	}



	.stage-image {

		width: 100%;

		height: 100%;

	}



	.mask-layer {

		position: absolute;

		z-index: 2;

	}



	.mask-canvas {

		position: absolute;

		left: 0;

		top: 0;

		display: block;

		pointer-events: none;

	}



	.export-mask-canvas {

		position: fixed;

		left: -9999px;

		top: 0;

		opacity: 0;

		pointer-events: none;

	}



	.size-badge {

		position: absolute;

		left: 20rpx;

		bottom: 20rpx;

		padding: 8rpx 20rpx;

		border-radius: 24rpx;

		background: rgba(0, 0, 0, 0.55);

		z-index: 10;



		text {

			font-size: 24rpx;

			color: #4facfe;

		}

	}



	.size-badge-pass {

		pointer-events: none;

	}



	.stage-hint-bar {

		padding: 12rpx 0 20rpx;

		box-sizing: border-box;

		text-align: center;



		text {

			font-size: 24rpx;

			color: #4facfe;

			line-height: 1.4;

		}

	}



	.toolbar {

		display: flex;

		gap: 20rpx;

		margin-bottom: 24rpx;



		.tool-chip {

			flex: 1;

			padding: 20rpx 0;

			text-align: center;

			border-radius: 40rpx;

			background: rgba(79, 172, 254, 0.15);

			border: 2rpx solid rgba(79, 172, 254, 0.35);



			text {

				font-size: 28rpx;

				color: #4facfe;

			}



			&.danger {

				background: rgba(255, 100, 100, 0.1);

				border-color: rgba(255, 100, 100, 0.35);



				text {

					color: #ff8a8a;

				}

			}



			&:active {

				opacity: 0.85;

			}

		}

	}



	.param-panel,

	.settings-panel {

		border-radius: 20rpx;

		padding: 28rpx;

		margin-bottom: 24rpx;

	}



	.section-label {

		display: flex;

		align-items: center;

		margin-bottom: 20rpx;



		.label-line {

			width: 8rpx;

			height: 32rpx;

			background: linear-gradient(to bottom, #4facfe, #00f2fe);

			border-radius: 4rpx;

			margin-right: 14rpx;



			&.line-pink {

				background: linear-gradient(to bottom, #fa709a, #fee140);

			}

		}



		text {

			font-size: 30rpx;

			font-weight: 600;

			color: var(--text-primary);

		}

	}



	.panel-row {

		display: flex;

		align-items: center;

		gap: 12rpx;

	}



	.panel-slider {

		flex: 1;

	}



	.panel-value {

		font-size: 28rpx;

		color: #4facfe;

		font-weight: 600;

		min-width: 48rpx;

		text-align: right;

	}



	.process-btn {

		background: linear-gradient(to right, #4facfe, #00f2fe);

		padding: 28rpx;

		border-radius: 50rpx;

		text-align: center;



		&.disabled {

			opacity: 0.7;

		}



		text {

			font-size: 32rpx;

			font-weight: bold;

			color: var(--text-primary);

		}



		&:active:not(.disabled) {

			opacity: 0.9;

			transform: scale(0.98);

		}

	}



	.save-btn {

		margin-top: 20rpx;

		padding: 28rpx;

		border-radius: 50rpx;

		text-align: center;

		background: rgba(79, 172, 254, 0.15);

		border: 2rpx solid rgba(79, 172, 254, 0.35);



		&.disabled {

			opacity: 0.7;

		}



		text {

			font-size: 30rpx;

			color: #4facfe;

			font-weight: 600;

		}



		&:active:not(.disabled) {

			opacity: 0.85;

		}

	}

</style>


