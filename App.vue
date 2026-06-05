<script>
	import { applyTheme, getStoredTheme } from '@/utils/theme/theme.js'

	export default {
		onLaunch: function() {
			console.log('App Launch')
			applyTheme(getStoredTheme())
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	@import url("static/iconfont/iconfont.css");
	@import url("style/color.css");
	@import url("style/common.css");
</style>
