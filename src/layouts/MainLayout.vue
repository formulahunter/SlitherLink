<script setup lang="ts">
import { ref } from 'vue';
import NavLink, { NavLinkProps } from 'components/NavLink.vue';

defineOptions({
  name: 'MainLayout'
});

const linksList: NavLinkProps[] = [
  {
    title: 'Generate',
    caption: 'Generate random boards & adjust game parameters',
    icon: 'tune', //  tune, edit, refresh, sync
    link: '/generate'
  },
  {
    title: 'Solve',
    caption: 'Inspect game/board constraints & find solution',
    icon: 'o_extension', //  extension, troubleshoot
    link: '/solve'
  },
  {
    title: 'Appearance',
    caption: 'Visual style settings',
    icon: 'o_shape_line', // shape-line, polyline, format-shapes, hexagon, style
    link: '/appearance'
  },
];

const leftDrawerOpen = ref(false);

function toggleLeftDrawer () {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          SlitherLink
        </q-toolbar-title>

      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      bordered
    >
      <q-list>
        <q-item-label
          header
        >
          Navigation
        </q-item-label>

        <NavLink
          v-for="link in linksList"
          :key="link.title"
          v-bind="link"
        />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
