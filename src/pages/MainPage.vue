<script setup lang="ts">
import BackdropImgConfig, { BackdropImageData } from 'components/BackdropImgConfig.vue';
import SVGGameBoard from 'components/SVGGameBoard.vue';
import { Ref, ref } from 'vue';

defineOptions({
  name: 'MainPage',
});

const radiusLabels = {0: '0', 2: '2', 4: '4', 6: '6'};

const radius = ref(4);

const navMenu = ref({
  generate: false,
  dataEntry: false,
  solve: false,
  appearance: false,
});

const backdrop: Ref<BackdropImageData | undefined> = ref();

function setBackdropImg(data: BackdropImageData) {
  backdrop.value = data;
  navMenu.value.generate = true;
}

</script>

<template>
  <q-page class="q-pa-md">
    <div class="row page-row items-stretch justify-between">
      <div class="col view">
        <BackdropImgConfig v-if="navMenu.dataEntry" :r="radius" @setBackdrop="setBackdropImg" />
        <SVGGameBoard v-if="navMenu.generate" :r="radius" :backdrop="backdrop" />
      </div>
      <div class="col-auto inputs">
        <q-list bordered>
          <q-expansion-item v-model="navMenu.generate" group="main_nav" label="Generate" icon="tune" expand-separator >
            <q-form>
              <q-card flat>
                <q-card-section>
                  <div class="row justify-start">
                    <label for="radius_input">Radius: {{ radius }}</label>
                  </div>
                  <div class="row justify-end">
                    <q-slider id="radius_input" v-model="radius" :min="0" :max="6" :step="1" snap label markers
                              :marker-labels="radiusLabels" class="radius-input"/>
                  </div>
                </q-card-section>
                <q-separator></q-separator>
                <q-card-actions align="right">
                  <q-btn label="Generate"></q-btn>
                </q-card-actions>
              </q-card>
            </q-form>
          </q-expansion-item>
          <q-expansion-item v-model="navMenu.dataEntry" group="main_nav" label="Enter Data" icon="numbers" expand-separator >

          </q-expansion-item>
          <q-expansion-item v-model="navMenu.solve" group="main_nav" label="Solve" icon="o_extension" expand-separator >

          </q-expansion-item>
          <q-expansion-item v-model="navMenu.appearance" group="main_nav" label="Appearance" icon="o_shape_line" expand-separator >

          </q-expansion-item>
        </q-list>
      </div>
    </div>
  </q-page>
</template>

<style lang="sass">
.q-page
  max-height: 80vh
  margin: 0
  //background: rgba(#000, 0.25)
  //overflow
.page-row
  //background: rgba(#000, 0.25)

.view
  width: 60%
  padding: 1rem
.inputs
  padding: 2rem
.view, .inputs
  //background: rgba(#000, 0.25)
.view + .inputs
  border-left: 2pt solid black

.view svg
  border: 1pt solid black
  aspect-ratio: 1.6

.radius-input
  width: 12rem
</style>
