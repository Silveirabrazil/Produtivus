import { createApp } from 'vue'
import App from './App.vue'

const mountEl = (document.getElementById('mm-vue-app') || document.getElementById('app')) as HTMLElement
createApp(App).mount(mountEl)
