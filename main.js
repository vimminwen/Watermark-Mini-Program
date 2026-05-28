import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
import DarkPageMeta from '@/components/common/DarkPageMeta.vue'
import SafeAreaBottom from '@/components/common/SafeAreaBottom.vue'
import ToolTipsCard from '@/components/common/ToolTipsCard.vue'
import PhoneQuickLoginButton from '@/components/user/PhoneQuickLoginButton.vue'

export function createApp() {
  const app = createSSRApp(App)
  app.component('dark-page-meta', DarkPageMeta)
  app.component('safe-area-bottom', SafeAreaBottom)
  app.component('tool-tips-card', ToolTipsCard)
  app.component('phone-quick-login-btn', PhoneQuickLoginButton)
  return {
    app
  }
}
// #endif