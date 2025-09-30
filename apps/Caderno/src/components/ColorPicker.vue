<template>
<div class="color-picker">
<div class="color-header">
<span>{{ title }}</span>
<button @click="$emit('close')" class="close-btn">×</button>
</div>
<div class="colors">
<div v-for="color in colors" :key="color" class="color" :style="{ backgroundColor: color }" @click="$emit('update:modelValue', color)"></div>
</div>
</div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string; title?: string }>()
defineEmits<{ 'update:modelValue': [value: string]; 'close': [] }>()
const colors = ['#000', '#333', '#666', '#999', '#ccc', '#fff', '#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff']
</script>

<style scoped>
.color-picker { position: absolute; top: 100%; left: 0; z-index: 1000; background: white; border: 1px solid #ccc; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); padding: 10px; min-width: 200px; }
.color-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; font-weight: 500; }
.close-btn { background: none; border: none; cursor: pointer; font-size: 16px; color: #666; padding: 2px 4px; border-radius: 3px; }
.close-btn:hover { background: #f0f0f0; }
.colors { display: grid; grid-template-columns: repeat(6, 1fr); gap: 3px; }
.color { width: 24px; height: 24px; border-radius: 3px; cursor: pointer; border: 1px solid #ddd; transition: transform 0.1s; }
.color:hover { transform: scale(1.1); border-color: #333; }
</style>
