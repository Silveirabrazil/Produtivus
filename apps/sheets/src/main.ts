import { createApp } from 'vue'
import App from './App.vue'

const mountEl = (document.getElementById('sheets-vue-app') || document.getElementById('app')) as HTMLElement
createApp(App).mount(mountEl)
