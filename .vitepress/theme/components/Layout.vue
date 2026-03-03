<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import { computed } from 'vue'
import ChatWidget from './ChatWidget.vue'

const { frontmatter } = useData()

const pageClass = computed(() =>
  frontmatter.value.layout === 'home' ? 'lh-page-home' : 'lh-page-doc'
)
</script>

<template>
  <div :class="pageClass">
    <DefaultTheme.Layout>
      <template #layout-bottom>
        <ChatWidget />
      </template>
    </DefaultTheme.Layout>
  </div>
</template>

<style scoped>
div { display: contents; }
</style>
