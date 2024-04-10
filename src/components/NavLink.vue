<script setup lang="ts">
defineOptions({
  name: 'NavLink'
});

export interface NavLinkProps {
  title: string;
  caption?: string;
  link?: string;
  icon?: string;
};

withDefaults(defineProps<NavLinkProps>(), {
  caption: '',
  link: '',
  icon: '',
});
</script>

<template>
  <q-item
    clickable
    tag="a"
    :href="link"
  >
    <q-item-section
      v-if="icon"
      avatar
    >
      <q-icon :name="icon" />
    </q-item-section>

    <q-item-section>
      <q-item-label>{{ title }}</q-item-label>
      <q-item-label caption>{{ caption }}</q-item-label>
    </q-item-section>
  </q-item>
</template>
