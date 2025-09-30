<template>
  <div id="app">
    <!-- Layout principal com o componente NotebookTabs que já tem sidebar -->
    <NotebookTabs />
  </div>
</template>

<script setup lang="ts">
import NotebookTabs from './components/NotebookTabs.vue'
</script>

<style scoped>
#app {
  height: 100vh;
  overflow: hidden;
}
</style>
