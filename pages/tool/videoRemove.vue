<template>
	<dark-page-meta />
	<view class="remove-page" :class="themeClass">
		<view class="preview-card boxBg">
			<view v-if="!hasVideoSelected" class="preview-empty" @tap="chooseVideo">
				<text class="iconfont icon-post_video empty-icon"></text>
				<text class="empty-title">点击选择视频</text>
				<text class="empty-desc">最长 45 秒，总像素不超过 1555200，建议 100MB 以内</text>
				<view class="sample-btn" @tap.stop="useSampleVideo">
					<text> 使用视频素材</text>
				</view>
			</view>
			<view v-else class="crop-stage" id="videoStage">
				<image
					v-if="thumbPath"
					class="stage-thumb is-visible"
					:src="thumbPath"
					mode="aspectFit"
					@load="onThumbLoad"
				/>
				<video
					v-else-if="previewVideoSrc"
					class="stage-thumb"
					:class="{ 'is-visible': previewContentVisible }"
					:key="previewVideoSrc"
					:src="previewVideoSrc"
					:controls="false"
					:show-center-play-btn="false"
					:show-play-btn="false"
					:enable-progress-gesture="false"
					:show-fullscreen-btn="false"
					:show-progress="false"
					object-fit="contain"
					muted
					:autoplay="true"
					@loadedmetadata="onPreviewVideoMeta"
					@loadeddata="onPreviewVideoReady"
					@canplay="onPreviewVideoReady"
					@error="onPreviewVideoError"
				/>
				<view
					v-if="previewLoading"
					class="stage-loading"
					:class="{ 'is-leaving': previewContentVisible && !thumbPath }"
				>
					<view class="stage-loading-spinner"></view>
					<processing-text text="加载中" />
				</view>
				<view
					v-if="stageReady"
					class="crop-box"
					:style="cropBoxStyle"
				>
					<view
						class="crop-box-body"
						@touchstart.stop="onCropTouchStart"
						@touchmove.stop.prevent="onCropTouchMove"
						@touchend.stop="onCropTouchEnd"
						@touchcancel.stop="onCropTouchEnd"
					>
						<view class="crop-grid">
							<view class="grid-line h1"></view>
							<view class="grid-line h2"></view>
							<view class="grid-line v1"></view>
							<view class="grid-line v2"></view>
						</view>
					</view>
					<view
						v-for="handle in resizeHandles"
						:key="handle"
						class="resize-handle"
						:class="'resize-handle--' + handle"
						@touchstart.stop="onHandleTouchStart(handle, $event)"
						@touchmove.stop.prevent="onCropTouchMove"
						@touchend.stop="onCropTouchEnd"
						@touchcancel.stop="onCropTouchEnd"
					></view>
				</view>
				<view v-if="videoMeta.width" class="meta-badge">
					<text>{{ videoMeta.width }}×{{ videoMeta.height }} · {{ videoMeta.duration }}s</text>
				</view>
			</view>
		</view>

		<view class="toolbar">
			<view class="tool-chip" @tap="chooseVideo">
				<text>{{ hasVideoSelected ? ' 换一个' : ' 选择视频' }}</text>
			</view>
			<view
				class="tool-chip sample"
				:class="{ disabled: previewLoading || materialLoading }"
				@tap="useSampleVideo"
			>
				<text> 视频素材</text>
			</view>
			<view v-if="hasVideoSelected" class="tool-chip danger" @click="resetAll">
				<text>清空</text>
			</view>
		</view>

		<view v-if="hasVideoSelected" class="settings-panel boxBg">
			<view class="section-label">
				<view class="label-line line-pink"></view>
				<text>消除区域</text>
			</view>
			<scroll-view class="chip-scroll" scroll-x enable-flex>
				<view
					v-for="item in regionPresets"
					:key="item.id"
					class="option-chip"
					:class="{ active: activeRegionId === item.id }"
					@click="selectRegionPreset(item)"
				>
					<text>{{ item.label }}</text>
				</view>
			</scroll-view>

			<view class="section-label region-params">
				<view class="label-line"></view>
				<text>区域参数（像素）</text>
			</view>
			<view class="param-grid">
				<view class="param-item">
					<text class="param-label">X</text>
					<text class="param-value">{{ pixelRegion.x }}</text>
				</view>
				<view class="param-item">
					<text class="param-label">Y</text>
					<text class="param-value">{{ pixelRegion.y }}</text>
				</view>
				<view class="param-item">
					<text class="param-label">宽 W</text>
					<text class="param-value">{{ pixelRegion.w }}</text>
				</view>
				<view class="param-item">
					<text class="param-label">高 H</text>
					<text class="param-value">{{ pixelRegion.h }}</text>
				</view>
			</view>

			<view class="size-adjust-row">
				<text class="size-adjust-label">区域宽度</text>
				<slider
					class="size-adjust-slider"
					:value="pixelRegion.w"
					:min="regionSizeMin.w"
					:max="regionWidthMax"
					:step="1"
					activeColor="#4facfe"
					backgroundColor="rgba(255,255,255,0.15)"
					block-color="#00f2fe"
					@changing="onRegionWidthChanging"
					@change="onRegionWidthChange"
				/>
				<text class="size-adjust-value">{{ pixelRegion.w }}px</text>
			</view>
			<view class="size-adjust-row">
				<text class="size-adjust-label">区域高度</text>
				<slider
					class="size-adjust-slider"
					:value="pixelRegion.h"
					:min="regionSizeMin.h"
					:max="regionHeightMax"
					:step="1"
					activeColor="#4facfe"
					backgroundColor="rgba(255,255,255,0.15)"
					block-color="#00f2fe"
					@changing="onRegionHeightChanging"
					@change="onRegionHeightChange"
				/>
				<text class="size-adjust-value">{{ pixelRegion.h }}px</text>
			</view>

			<view
				class="process-btn"
				:class="{ disabled: processing }"
				@click="handleRemove"
			>
				<processing-text
					:active="processing"
					text="处理中"
					idle-text="开始消除"
				/>
			</view>
		</view>

		<view v-if="resultPath" class="result-panel boxBg">
			<view class="section-label">
				<view class="label-line line-pink"></view>
				<text>处理结果</text>
			</view>
			<video
				class="result-video"
				:src="resultPath"
				controls
				show-center-play-btn
				object-fit="contain"
			/>
			<view class="result-actions">
				<view class="result-btn primary" @click="saveVideo">
					<text>{{ saving ? '保存中...' : '保存到相册' }}</text>
				</view>
				<view class="result-btn" @click="previewResult">
					<text>全屏预览</text>
				</view>
			</view>
		</view>

		<!-- 上传参数（测试，调试时取消注释）
		<view v-if="uploadParamsDisplay" class="upload-params-panel boxBg">
			<view class="upload-params-header">
				<view class="section-label upload-params-title">
					<view class="label-line line-pink"></view>
					<text>上传参数（测试）</text>
				</view>
				<view class="copy-chip" @click="copyUploadParams">
					<text>复制</text>
				</view>
			</view>
			<scroll-view scroll-y class="params-scroll" :show-scrollbar="true">
				<text class="params-text" selectable>{{ uploadParamsDisplay }}</text>
			</scroll-view>
		</view>
		-->

		<tool-tips-card :tips="tips" />
		<!-- 上传日志（调试时取消注释）
		<debug-log-panel
			:logs="debugLogs"
			:scroll-top="debugScrollTop"
			@clear="clearDebugLogs"
		/>
		-->
	</view>
	<safe-area-bottom />
</template>

<script setup>
	import { usePageTheme } from '@/utils/theme/useTheme.js'

	const { themeClass } = usePageTheme()
	import { ref, computed, reactive, getCurrentInstance, nextTick } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import { apiSubtitleRemoval, apiGetAiLog } from '@/api/api.js'
	import { isApiSuccess, getApiMessage } from '@/utils/user/authHelper.js'
	import { checkLogin } from '@/utils/user/auth.js'
	import { extractAiLogId, pollAiLogResult, resolveAiLogResultUrl } from '@/utils/ai/aiLog.js'
	import { calcAspectFitRect, clampNormCrop, applyCropResize, MIN_CROP_NORM_SIZE } from '@/utils/image/imageCrop.js'
	import { uploadVideoToOss } from '@/utils/video/ossUpload.js'
	import {
		DEFAULT_REMOVAL_FUNCTION_TYPE,
		REMOVAL_REGION_PRESETS,
		DEFAULT_REMOVAL_REGION,
		buildSubtitleRemovalPayload,
		normalizeRemovalVideoUrl,
		VIDEO_REMOVE_MAX_DURATION,
		VIDEO_REMOVE_MAX_PIXELS,
		VIDEO_REMOVE_SAMPLE_VIDEO,
		isVideoWithinRemovePixelLimit,
		getVideoRemovePixelLimitMessage
	} from '@/utils/video/subtitleRemoval.js'
	import { useDebugLog, showTaskLoading, hideTaskLoading } from '@/utils/debug/useDebugLog.js'
	import { baseUrl } from '@/utils/http.js'

	const {
		debugLogs,
		debugScrollTop,
		clearDebugLogs,
		logInfo,
		logStep,
		logOk,
		showDebugError
	} = useDebugLog('videoRemove')

	const instance = getCurrentInstance()

	const videoPath = ref('')
	const thumbPath = ref('')
	const sampleRemoteUrl = ref('')
	const resultPath = ref('')
	const videoMeta = ref({ width: 0, height: 0, duration: 0 })
	const displayRect = ref({ x: 0, y: 0, w: 0, h: 0 })
	const stageReady = ref(false)
	const activeRegionId = ref('bottom')
	const processing = ref(false)
	const saving = ref(false)
	const previewLoading = ref(false)
	const materialLoading = ref(false)
	const previewContentVisible = ref(false)
	const uploadParamsText = ref('')

	const hasVideoSelected = computed(
		() => !!(videoPath.value || sampleRemoteUrl.value || materialLoading.value)
	)
	const previewVideoSrc = computed(() => videoPath.value || sampleRemoteUrl.value)

	const normCrop = reactive({ ...DEFAULT_REMOVAL_REGION })

	const regionPresets = REMOVAL_REGION_PRESETS
	const resizeHandles = ['tl', 'tr', 'bl', 'br']

	let touchSnapshot = null
	let previewLoadingTimer = null
	let previewReadyHandled = false

	const resetPreviewReadyState = () => {
		previewReadyHandled = false
		previewContentVisible.value = false
		previewLoading.value = true
	}

	const clearPreviewLoading = () => {
		previewLoading.value = false
		if (previewLoadingTimer) {
			clearTimeout(previewLoadingTimer)
			previewLoadingTimer = null
		}
	}

	const markPreviewReady = () => {
		if (previewReadyHandled) return
		previewReadyHandled = true
		previewContentVisible.value = true
		nextTick(() => {
			setTimeout(() => clearPreviewLoading(), 120)
		})
	}

	const schedulePreviewLoadingFallback = () => {
		if (previewLoadingTimer) clearTimeout(previewLoadingTimer)
		previewLoadingTimer = setTimeout(() => {
			markPreviewReady()
			previewLoadingTimer = null
		}, 8000)
	}

	const tips = [
		`选择最长 45 秒的视频，总像素上限 ${VIDEO_REMOVE_MAX_PIXELS.toLocaleString()}（如 1440×1080），横屏、竖屏都按总像素算，在封面上拖动方框标出要消除的区域`,
		'可使用「视频素材」快速加载样例视频（地址配置后生效）',
		'拖动方框移动位置，拖四角缩放大小，或用下方滑块微调宽高',
		'处理需上传视频，请保持网络畅通',
		'处理完成后可预览并保存到相册'
	]

	const pixelRegion = computed(() => {
		const w = videoMeta.value.width || 0
		const h = videoMeta.value.height || 0
		if (!w || !h) {
			return { x: 0, y: 0, w: 0, h: 0 }
		}
		return {
			x: Math.round(normCrop.x * w),
			y: Math.round(normCrop.y * h),
			w: Math.max(1, Math.round(normCrop.w * w)),
			h: Math.max(1, Math.round(normCrop.h * h))
		}
	})

	const cropBoxStyle = computed(() => {
		const d = displayRect.value
		if (!d.w || !d.h) return {}
		return {
			left: `${d.x + normCrop.x * d.w}px`,
			top: `${d.y + normCrop.y * d.h}px`,
			width: `${normCrop.w * d.w}px`,
			height: `${normCrop.h * d.h}px`
		}
	})

	const regionWidthMax = computed(() => {
		const vw = videoMeta.value.width || 0
		if (!vw) return 100
		return Math.max(1, Math.round((1 - normCrop.x) * vw))
	})

	const regionHeightMax = computed(() => {
		const vh = videoMeta.value.height || 0
		if (!vh) return 100
		return Math.max(1, Math.round((1 - normCrop.y) * vh))
	})

	const regionSizeMin = computed(() => {
		const vw = videoMeta.value.width || 1
		const vh = videoMeta.value.height || 1
		return {
			w: Math.max(1, Math.round(MIN_CROP_NORM_SIZE * vw)),
			h: Math.max(1, Math.round(MIN_CROP_NORM_SIZE * vh))
		}
	})

	const applyPixelRegionSize = (widthPx, heightPx) => {
		const vw = videoMeta.value.width || 0
		const vh = videoMeta.value.height || 0
		if (!vw || !vh) return
		activeRegionId.value = 'custom'
		Object.assign(
			normCrop,
			clampNormCrop({
				x: normCrop.x,
				y: normCrop.y,
				w: widthPx / vw,
				h: heightPx / vh
			})
		)
	}

	const onRegionWidthChanging = (e) => {
		applyPixelRegionSize(Math.round(Number(e.detail.value) || 0), pixelRegion.value.h)
	}

	const onRegionWidthChange = (e) => {
		onRegionWidthChanging(e)
	}

	const onRegionHeightChanging = (e) => {
		applyPixelRegionSize(pixelRegion.value.w, Math.round(Number(e.detail.value) || 0))
	}

	const onRegionHeightChange = (e) => {
		onRegionHeightChanging(e)
	}

	const buildUploadParamsBody = (videoUrl = '') =>
		buildSubtitleRemovalPayload({
			videoUrl: videoUrl || sampleRemoteUrl.value || '(OSS 上传后填充)',
			normRegion: { ...normCrop },
			videoWidth: videoMeta.value.width,
			videoHeight: videoMeta.value.height,
			duration: videoMeta.value.duration,
			functionType: DEFAULT_REMOVAL_FUNCTION_TYPE
		})

	const formatUploadParams = (body) =>
		JSON.stringify(
			{
				url: `${baseUrl}/front/ai/subtitle-removal`,
				method: 'POST',
				body
			},
			null,
			2
		)

	const uploadParamsDisplay = computed(() => {
		if (uploadParamsText.value) return uploadParamsText.value
		if (!hasVideoSelected.value) return ''
		return formatUploadParams(buildUploadParamsBody())
	})

	onLoad((options) => {
		if (options?.title) {
			uni.setNavigationBarTitle({ title: decodeURIComponent(options.title) })
		}
	})

	const validateVideoMeta = (width, height, duration) => {
		const dur = Math.ceil(Number(duration) || 0)
		if (dur > VIDEO_REMOVE_MAX_DURATION) {
			uni.showToast({
				title: `视频时长不能超过 ${VIDEO_REMOVE_MAX_DURATION} 秒${dur ? `（当前约 ${dur} 秒）` : ''}`,
				icon: 'none'
			})
			return false
		}

		const w = Math.round(Number(width) || 0)
		const h = Math.round(Number(height) || 0)
		if (w && h && !isVideoWithinRemovePixelLimit(w, h)) {
			uni.showToast({
				title: getVideoRemovePixelLimitMessage(w, h),
				icon: 'none'
			})
			return false
		}

		return true
	}

	const getVideoInfoSafe = (src) =>
		new Promise((resolve) => {
			if (typeof uni.getVideoInfo !== 'function') {
				resolve(null)
				return
			}
			uni.getVideoInfo({
				src,
				success: (info) => resolve(info),
				fail: () => resolve(null)
			})
		})

	const applyVideoMeta = (width, height, duration) => {
		videoMeta.value = {
			width: Math.round(Number(width) || 0),
			height: Math.round(Number(height) || 0),
			duration: Math.round(Number(duration) || 0)
		}
		stageReady.value = false
		nextTick(() => measureStage())
	}

	const enrichVideoMetaFromPath = async (path) => {
		const info = await getVideoInfoSafe(path)
		if (!info) return false

		const width = Math.round(Number(info.width) || 0)
		const height = Math.round(Number(info.height) || 0)
		const duration = Math.ceil(Number(info.duration) || 0)
		if (!validateVideoMeta(width, height, duration)) {
			resetAll()
			return false
		}

		applyVideoMeta(width, height, duration)
		return true
	}

	const applyVideoFile = (file) => {
		const path = file?.tempFilePath
		if (!path) {
			uni.showToast({ title: '未获取到视频文件', icon: 'none' })
			return
		}
		if (file.size && file.size > 100 * 1024 * 1024) {
			uni.showToast({ title: '视频请小于 100MB', icon: 'none' })
			return
		}

		const duration = Math.ceil(Number(file.duration) || 0)
		if (duration > VIDEO_REMOVE_MAX_DURATION) {
			uni.showToast({
				title: `视频时长不能超过 ${VIDEO_REMOVE_MAX_DURATION} 秒（当前约 ${duration} 秒）`,
				icon: 'none'
			})
			return
		}

		const width = Math.round(Number(file.width) || 0)
		const height = Math.round(Number(file.height) || 0)
		if (width && height && !isVideoWithinRemovePixelLimit(width, height)) {
			uni.showToast({
				title: getVideoRemovePixelLimitMessage(width, height),
				icon: 'none'
			})
			return
		}

		resultPath.value = ''
		uploadParamsText.value = ''
		sampleRemoteUrl.value = ''
		stageReady.value = false
		videoPath.value = path
		thumbPath.value = file.thumbTempFilePath || ''
		if (thumbPath.value) {
			previewContentVisible.value = true
			previewLoading.value = false
			previewReadyHandled = true
		} else {
			resetPreviewReadyState()
			schedulePreviewLoadingFallback()
		}
		videoMeta.value = {
			width,
			height,
			duration: Math.round(file.duration || 0)
		}
		Object.assign(normCrop, { ...DEFAULT_REMOVAL_REGION })
		activeRegionId.value = 'bottom'

		if (width && height) {
			nextTick(() => measureStage())
		} else {
			enrichVideoMetaFromPath(path)
		}
	}

	const onPickFail = (err) => {
		console.warn('[chooseVideo]', err)
		const msg = String(err?.errMsg || err?.message || '')
		if (/cancel|取消/.test(msg)) return
		uni.showToast({
			title: msg.includes('auth') ? '请授权相册/相机权限' : '选择视频失败',
			icon: 'none'
		})
	}

	const downloadFile = (url) =>
		new Promise((resolve, reject) => {
			uni.downloadFile({
				url,
				success: (res) => {
					if (res.statusCode === 200 && res.tempFilePath) {
						resolve(res.tempFilePath)
					} else {
						reject(new Error('下载视频失败'))
					}
				},
				fail: reject
			})
		})

	const beginMaterialLoading = () => {
		resultPath.value = ''
		uploadParamsText.value = ''
		videoPath.value = ''
		thumbPath.value = ''
		sampleRemoteUrl.value = ''
		stageReady.value = false
		materialLoading.value = true
		resetPreviewReadyState()
		schedulePreviewLoadingFallback()
		videoMeta.value = { width: 0, height: 0, duration: 0 }
		Object.assign(normCrop, { ...DEFAULT_REMOVAL_REGION })
		activeRegionId.value = 'bottom'
	}

	const useSampleVideo = async () => {
		if (previewLoading.value || materialLoading.value) return

		const sampleUrl = String(VIDEO_REMOVE_SAMPLE_VIDEO.url || '').trim()
		if (!sampleUrl) {
			uni.showToast({ title: '视频素材地址暂未配置', icon: 'none' })
			return
		}

		beginMaterialLoading()

		try {
			const tempPath = await downloadFile(sampleUrl)
			const info = await getVideoInfoSafe(tempPath)
			const width = Math.round(Number(info?.width || VIDEO_REMOVE_SAMPLE_VIDEO.width || 0))
			const height = Math.round(Number(info?.height || VIDEO_REMOVE_SAMPLE_VIDEO.height || 0))
			const duration = Math.ceil(Number(info?.duration || VIDEO_REMOVE_SAMPLE_VIDEO.duration || 0))

			if (!validateVideoMeta(width, height, duration)) {
				resetAll()
				return
			}

			materialLoading.value = false
			videoPath.value = tempPath
			resetPreviewReadyState()
			schedulePreviewLoadingFallback()
			applyVideoMeta(width, height, duration)
		} catch (err) {
			console.error('[useSampleVideo]', err)
			resetAll()
			uni.showToast({
				title: err?.message || '视频素材加载失败',
				icon: 'none'
			})
		}
	}

	const chooseVideo = () => {
		// 微信小程序优先 chooseMedia（maxDuration 限制拍摄时长；相册视频在 applyVideoFile 二次校验）
		if (typeof uni.chooseMedia === 'function') {
			uni.chooseMedia({
				count: 1,
				mediaType: ['video'],
				sourceType: ['album', 'camera'],
				maxDuration: VIDEO_REMOVE_MAX_DURATION,
				success: (res) => {
					const file = res.tempFiles?.[0]
					if (!file) {
						uni.showToast({ title: '未选择视频', icon: 'none' })
						return
					}
					applyVideoFile({
						tempFilePath: file.tempFilePath,
						thumbTempFilePath: file.thumbTempFilePath,
						size: file.size,
						width: file.width,
						height: file.height,
						duration: file.duration
					})
				},
				fail: onPickFail
			})
			return
		}

		uni.chooseVideo({
			sourceType: ['album', 'camera'],
			compressed: true,
			maxDuration: VIDEO_REMOVE_MAX_DURATION,
			success: (res) => {
				applyVideoFile({
					tempFilePath: res.tempFilePath,
					thumbTempFilePath: res.thumbTempFilePath,
					size: res.size,
					width: res.width,
					height: res.height,
					duration: res.duration
				})
			},
			fail: onPickFail
		})
	}

	const resetAll = () => {
		videoPath.value = ''
		thumbPath.value = ''
		sampleRemoteUrl.value = ''
		resultPath.value = ''
		uploadParamsText.value = ''
		materialLoading.value = false
		previewReadyHandled = false
		previewContentVisible.value = false
		clearPreviewLoading()
		videoMeta.value = { width: 0, height: 0, duration: 0 }
		stageReady.value = false
		activeRegionId.value = 'bottom'
		Object.assign(normCrop, { ...DEFAULT_REMOVAL_REGION })
		touchSnapshot = null
	}

	const onThumbLoad = () => {
		markPreviewReady()
		nextTick(() => measureStage())
	}

	const onPreviewVideoReady = () => {
		markPreviewReady()
		nextTick(() => measureStage())
	}

	const onPreviewVideoError = () => {
		if (!previewReadyHandled) {
			clearPreviewLoading()
		}
		if (!videoMeta.value.width || !videoMeta.value.height) {
			uni.showToast({ title: '视频预览失败', icon: 'none' })
		}
	}

	const onPreviewVideoMeta = (e) => {
		const detail = e?.detail || {}
		const width = Math.round(Number(detail.width) || 0)
		const height = Math.round(Number(detail.height) || 0)
		const duration = Math.ceil(Number(detail.duration) || 0)

		if (!validateVideoMeta(width, height, duration)) {
			resetAll()
			return
		}

		const nextWidth = width || videoMeta.value.width
		const nextHeight = height || videoMeta.value.height
		if (nextWidth && nextHeight) {
			applyVideoMeta(nextWidth, nextHeight, duration || videoMeta.value.duration)
		}
	}

	const measureStage = () => {
		const query = uni.createSelectorQuery()
		const scope = instance?.proxy ?? instance
		if (scope) query.in(scope)
		query
			.select('#videoStage')
			.boundingClientRect((rect) => {
				if (!rect?.width || !rect?.height) return
				const w = videoMeta.value.width
				const h = videoMeta.value.height
				if (!w || !h) return
				displayRect.value = calcAspectFitRect(rect.width, rect.height, w, h)
				stageReady.value = true
			})
			.exec()
	}

	const selectRegionPreset = (item) => {
		activeRegionId.value = item.id
		Object.assign(normCrop, clampNormCrop({ ...item.region }))
	}

	const onCropTouchStart = (e) => {
		activeRegionId.value = 'custom'
		const touch = e.touches?.[0]
		if (!touch) return
		touchSnapshot = {
			mode: 'move',
			clientX: touch.clientX,
			clientY: touch.clientY,
			regionX: normCrop.x,
			regionY: normCrop.y,
			regionW: normCrop.w,
			regionH: normCrop.h
		}
	}

	const onHandleTouchStart = (handle, e) => {
		activeRegionId.value = 'custom'
		const touch = e.touches?.[0]
		if (!touch) return
		touchSnapshot = {
			mode: 'resize',
			handle,
			clientX: touch.clientX,
			clientY: touch.clientY,
			regionX: normCrop.x,
			regionY: normCrop.y,
			regionW: normCrop.w,
			regionH: normCrop.h
		}
	}

	const onCropTouchMove = (e) => {
		if (!touchSnapshot || !displayRect.value.w) return
		const touch = e.touches?.[0]
		if (!touch) return

		const dx = (touch.clientX - touchSnapshot.clientX) / displayRect.value.w
		const dy = (touch.clientY - touchSnapshot.clientY) / displayRect.value.h

		if (touchSnapshot.mode === 'move') {
			const clamped = clampNormCrop({
				x: touchSnapshot.regionX + dx,
				y: touchSnapshot.regionY + dy,
				w: touchSnapshot.regionW,
				h: touchSnapshot.regionH
			})
			normCrop.x = clamped.x
			normCrop.y = clamped.y
			return
		}

		Object.assign(normCrop, applyCropResize(touchSnapshot, dx, dy))
	}

	const onCropTouchEnd = () => {
		touchSnapshot = null
	}

	const downloadVideo = (url) => downloadFile(url)

	const handleRemove = async () => {
		if (processing.value || !hasVideoSelected.value) return
		if (!checkLogin()) return

		if (!videoMeta.value.width || !videoMeta.value.height) {
			uni.showToast({ title: '视频信息加载中，请稍候', icon: 'none' })
			return
		}

		if (!isVideoWithinRemovePixelLimit(videoMeta.value.width, videoMeta.value.height)) {
			uni.showToast({
				title: getVideoRemovePixelLimitMessage(videoMeta.value.width, videoMeta.value.height),
				icon: 'none'
			})
			return
		}

		const duration = Math.ceil(Number(videoMeta.value.duration) || 0)
		if (duration > VIDEO_REMOVE_MAX_DURATION) {
			uni.showToast({
				title: `视频时长不能超过 ${VIDEO_REMOVE_MAX_DURATION} 秒`,
				icon: 'none'
			})
			return
		}

		processing.value = true
		resultPath.value = ''
		logInfo(`API 根地址: ${baseUrl}`)

		try {
			let ossUrl = ''
			if (sampleRemoteUrl.value) {
				logStep('1/4 使用测试素材地址')
				showTaskLoading({ title: '提交任务...', mask: true })
				ossUrl = sampleRemoteUrl.value
				logOk(`测试素材地址\n${ossUrl}`)
			} else {
				logStep('1/4 上传视频到 OSS')
				showTaskLoading({ title: '上传视频...', mask: true })
				ossUrl = await uploadVideoToOss(videoPath.value)
				logOk(`OSS 上传成功\n${ossUrl}`)
			}

			logStep('2/4 提交视频消除任务')
			showTaskLoading({ title: '消除中...', mask: true })

			const payload = buildSubtitleRemovalPayload({
				videoUrl: ossUrl,
				normRegion: { ...normCrop },
				videoWidth: videoMeta.value.width,
				videoHeight: videoMeta.value.height,
				duration: videoMeta.value.duration,
				functionType: DEFAULT_REMOVAL_FUNCTION_TYPE
			})
			uploadParamsText.value = formatUploadParams(payload)
			logInfo(`上传参数\n${uploadParamsText.value}`)

			const res = await apiSubtitleRemoval(payload)
			const body = res?.data
			if (!isApiSuccess(body)) {
				throw new Error(getApiMessage(body, '视频消除失败'))
			}

			let resultUrl = resolveAiLogResultUrl(body) || normalizeRemovalVideoUrl(body)

			if (!resultUrl) {
				const aiLogId = extractAiLogId(body)
				if (!aiLogId) {
					throw new Error('未获取到任务 ID')
				}
				logStep(`3/4 轮询任务结果 (id=${aiLogId})`)
				showTaskLoading({ title: '消除中...', mask: true })
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

			logStep('4/4 下载结果')
			showTaskLoading({ title: '下载结果...', mask: true })
			const localPath = await downloadVideo(resultUrl)
			resultPath.value = localPath
			logOk('处理完成')
			uni.showToast({ title: '处理完成', icon: 'success' })
		} catch (err) {
			console.error('[handleRemove]', err)
			showDebugError('视频消除失败', err)
		} finally {
			processing.value = false
			hideTaskLoading()
		}
	}

	const saveVideo = () => {
		if (saving.value || !resultPath.value) return
		saving.value = true
		uni.saveVideoToPhotosAlbum({
			filePath: resultPath.value,
			success: () => {
				uni.showToast({ title: '已保存到相册', icon: 'success' })
			},
			fail: (err) => {
				console.error('[saveVideo]', err)
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

	const previewResult = () => {
		if (!resultPath.value) return
		uni.previewMedia({
			sources: [{ url: resultPath.value, type: 'video' }]
		})
	}

	const copyUploadParams = () => {
		const text = uploadParamsDisplay.value
		if (!text) {
			uni.showToast({ title: '暂无参数可复制', icon: 'none' })
			return
		}
		uni.setClipboardData({
			data: text,
			success: () => {
				uni.showToast({ title: '已复制到剪贴板', icon: 'none' })
			},
			fail: () => {
				uni.showToast({ title: '复制失败', icon: 'none' })
			}
		})
	}
</script>

<style lang="scss" scoped>
	.remove-page {
		min-height: 100vh;
		padding: 30rpx;
		padding-bottom: 140rpx;
		box-sizing: border-box;
		background: linear-gradient(to bottom, var(--page-bg-start), var(--page-bg-end));
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

		&.region-params {
			margin-top: 8rpx;
		}
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
		cursor: pointer;

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
			margin-bottom: 28rpx;
		}

		.sample-btn {
			padding: 18rpx 40rpx;
			border-radius: 40rpx;
			background: rgba(255, 180, 100, 0.15);
			border: 2rpx solid rgba(255, 180, 100, 0.4);

			text {
				font-size: 28rpx;
				color: #ffb464;
			}

			&:active {
				opacity: 0.85;
			}
		}
	}

	.crop-stage {
		position: relative;
		width: 100%;
		height: 480rpx;
		overflow: hidden;
		background: #000;
	}

	.stage-thumb {
		width: 100%;
		height: 100%;
		display: block;
		opacity: 0;
		transition: opacity 0.2s ease;

		&.is-visible {
			opacity: 1;
		}
	}

	.stage-loading {
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 4;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 20rpx;
		background: rgba(0, 0, 0, 0.55);
		transition: opacity 0.2s ease;
		opacity: 1;

		&.is-leaving {
			opacity: 0;
			pointer-events: none;
		}
	}

	.stage-loading-spinner {
		width: 56rpx;
		height: 56rpx;
		border: 4rpx solid rgba(255, 255, 255, 0.2);
		border-top-color: #4facfe;
		border-radius: 50%;
		animation: stage-spin 0.8s linear infinite;
	}

	@keyframes stage-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.crop-box {
		position: absolute;
		box-sizing: border-box;
		border: 2rpx solid #4facfe;
		box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
		z-index: 2;
	}

	.crop-box-body {
		position: absolute;
		inset: 0;
		z-index: 1;
	}

	.resize-handle {
		position: absolute;
		width: 36rpx;
		height: 36rpx;
		background: #4facfe;
		border: 3rpx solid #ffffff;
		border-radius: 50%;
		box-sizing: border-box;
		z-index: 3;

		&--tl {
			left: -18rpx;
			top: -18rpx;
		}

		&--tr {
			right: -18rpx;
			top: -18rpx;
		}

		&--bl {
			left: -18rpx;
			bottom: -18rpx;
		}

		&--br {
			right: -18rpx;
			bottom: -18rpx;
		}
	}

	.crop-grid {
		position: absolute;
		inset: 0;
		pointer-events: none;

		.grid-line {
			position: absolute;
			background: var(--surface-bg-strong);

			&.h1 {
				left: 0;
				right: 0;
				top: 33.33%;
				height: 1rpx;
			}

			&.h2 {
				left: 0;
				right: 0;
				top: 66.66%;
				height: 1rpx;
			}

			&.v1 {
				top: 0;
				bottom: 0;
				left: 33.33%;
				width: 1rpx;
			}

			&.v2 {
				top: 0;
				bottom: 0;
				left: 66.66%;
				width: 1rpx;
			}
		}
	}

	.meta-badge {
		position: absolute;
		right: 20rpx;
		top: 20rpx;
		padding: 8rpx 16rpx;
		border-radius: 20rpx;
		background: rgba(0, 0, 0, 0.55);
		z-index: 3;

		text {
			font-size: 22rpx;
			color: #4facfe;
		}
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 20rpx;
		margin-bottom: 24rpx;

		.tool-chip {
			flex: 1;
			min-width: calc(50% - 10rpx);
			padding: 20rpx 0;
			text-align: center;
			border-radius: 40rpx;
			background: rgba(79, 172, 254, 0.15);
			border: 2rpx solid rgba(79, 172, 254, 0.35);

			text {
				font-size: 28rpx;
				color: #4facfe;
			}

			&.sample {
				background: rgba(255, 180, 100, 0.12);
				border-color: rgba(255, 180, 100, 0.35);

				text {
					color: #ffb464;
				}
			}

			&.disabled {
				opacity: 0.6;
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

	.settings-panel,
	.result-panel {
		border-radius: 20rpx;
		padding: 28rpx;
		margin-bottom: 24rpx;
	}

	.chip-scroll {
		white-space: nowrap;
		width: 100%;
		margin-bottom: 24rpx;
	}

	.option-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 16rpx 28rpx;
		margin-right: 16rpx;
		border-radius: 32rpx;
		background: var(--surface-bg);
		border: 2rpx solid transparent;

		text {
			font-size: 26rpx;
			color: var(--text-secondary);
		}

		&.active {
			background: rgba(79, 172, 254, 0.2);
			border-color: #4facfe;

			text {
				color: #4facfe;
				font-weight: 600;
			}
		}
	}

	.param-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16rpx;
		margin-bottom: 24rpx;
	}

	.param-item {
		padding: 16rpx 20rpx;
		border-radius: 12rpx;
		background: rgba(0, 0, 0, 0.2);

		.param-label {
			display: block;
			font-size: 22rpx;
			color: var(--text-muted);
			margin-bottom: 6rpx;
		}

		.param-value {
			font-size: 28rpx;
			color: #4facfe;
			font-weight: 600;
		}
	}

	.size-adjust-row {
		display: flex;
		align-items: center;
		gap: 16rpx;
		margin-bottom: 20rpx;

		&:last-of-type {
			margin-bottom: 24rpx;
		}

		.size-adjust-label {
			font-size: 26rpx;
			color: var(--text-secondary);
			flex-shrink: 0;
			width: 120rpx;
		}

		.size-adjust-slider {
			flex: 1;
		}

		.size-adjust-value {
			font-size: 24rpx;
			color: #4facfe;
			width: 96rpx;
			text-align: right;
			flex-shrink: 0;
		}
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

	.result-video {
		width: 100%;
		height: 400rpx;
		border-radius: 12rpx;
		margin-bottom: 24rpx;
		background: #000;
	}

	.result-actions {
		display: flex;
		gap: 20rpx;

		.result-btn {
			flex: 1;
			padding: 22rpx 0;
			text-align: center;
			border-radius: 40rpx;
			background: var(--surface-bg);
			border: 2rpx solid var(--border-color);

			text {
				font-size: 28rpx;
				color: var(--text-primary);
			}

			&.primary {
				background: linear-gradient(to right, #4facfe, #00f2fe);
				border-color: transparent;
			}

			&:active {
				opacity: 0.85;
			}
		}
	}

	.upload-params-panel {
		border-radius: 20rpx;
		padding: 28rpx;
		margin-bottom: 24rpx;
		border: 1rpx dashed rgba(255, 200, 100, 0.45);
	}

	.upload-params-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16rpx;
		margin-bottom: 16rpx;
	}

	.upload-params-title {
		margin-bottom: 0;
		flex: 1;
	}

	.copy-chip {
		flex-shrink: 0;
		padding: 10rpx 24rpx;
		border-radius: 24rpx;
		background: rgba(79, 172, 254, 0.15);
		border: 2rpx solid rgba(79, 172, 254, 0.35);

		text {
			font-size: 24rpx;
			color: #4facfe;
		}

		&:active {
			opacity: 0.85;
		}
	}

	.params-scroll {
		max-height: 360rpx;
	}

	.params-text {
		display: block;
		font-size: 22rpx;
		line-height: 1.6;
		color: var(--text-secondary);
		font-family: monospace;
		white-space: pre-wrap;
		word-break: break-all;
	}
</style>
