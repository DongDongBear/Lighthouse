import DefaultTheme from 'vitepress/theme'
import './custom.css'
import ChatWidget from './components/ChatWidget.vue'
import { h } from 'vue'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-bottom': () => h(ChatWidget)
    })
  }
}
