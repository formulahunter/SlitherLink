<script setup lang="ts">
import SVGGameBoard from 'components/SVGGameBoard.vue';
import { initBoard } from 'src/model';
import { computed, Ref, ref, watchEffect } from 'vue';

defineOptions({
  name: 'MainPage',
});

const navMenu = ref({
  structure: false,
  data: false,
  state: false,
  appearance: false,
});

const radius = ref(4);
const radiusLabels = {0: '0', 2: '2', 4: '4', 6: '6'};

const board = computed(() => {
  return initBoard(radius.value);
});

const bdFile: Ref<File | null> = ref(null);
const bdDatums = ref({ nu0: Number.NaN, nud: Number.NaN, mur: Number.NaN });
const bdSize: Ref<[number, number]> = ref([0, 0]);
const bdHref = computed(() => {
  if(bdFile.value === null) {
    return '';
  }
  return URL.createObjectURL(bdFile.value);
});
watchEffect((onCleanup) => {
  const newVal = bdHref.value;
  if(newVal === '') {
    bdSize.value = [0, 0];
    return;
  }
  onCleanup(() => URL.revokeObjectURL(newVal));

  const img = new Image();
  img.onload = () => {
    console.log(img.width, img.height);
    bdSize.value = [img.width, img.height];
  };
  img.src = newVal;
});

const bdPropData = computed(() => {
  if(bdFile.value === null) {
    return null;
  }

  return {
    file: bdFile.value,
    size: bdSize.value,
    href: bdHref.value,
    datums: bdDatums.value,
  };
})

</script>

<template>
  <q-page class="q-pa-md">
    <div class="row page-row items-stretch justify-between">
      <div class="col view">
        <SVGGameBoard :structure="board" :backdrop="bdPropData" />
      </div>
      <div class="col-auto inputs">
        <q-list bordered>
          <q-expansion-item v-model="navMenu.structure" group="main_nav" label="Structure" icon="tune" expand-separator >
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
            </q-card>
          </q-expansion-item>
          <q-expansion-item v-model="navMenu.data" group="main_nav" label="Data" icon="numbers" expand-separator >
            <q-card flat>
              <q-card-section>
                <q-list>
                  <q-item>
                    <q-item-section>
                      <q-item-label header>
                        <label for="backdrop_input">Backdrop file:</label>
                      </q-item-label>
                      <div class="row justify-end">
                        <q-file id="backdrop_input" v-model="bdFile" filled name="backdrop" accept="image/*"
                                label="Choose photo"/>
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
              <q-separator inset />
              <q-card-section v-if="bdFile !== null">
                <q-list>
                  <q-item>
                    <q-item-section>
                      <q-item-label header>
                        Datums
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label>
                        <label for="bd_nu0_input">&nu;<sub>0</sub>: {{ bdDatums.nu0 }}</label>
                      </q-item-label>
                      <div class="row justify-end">
                        <q-slider id="bd_nu0_input" v-model="bdDatums.nu0" :min="-bdSize[1]" :max="bdSize[1]" :step="1" markers />
                      </div>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label>
                        <label for="bd_nud_input">&nu;<sub>d</sub>: {{ bdDatums.nud }}</label>
                      </q-item-label>
                      <div class="row justify-end">
                        <q-slider id="bd_nud_input" v-model="bdDatums.nud" :min="-bdSize[1]" :max="bdSize[1]" :step="1" markers />
                      </div>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label>
                        <label for="bd_mur_input">&mu;<sub>r</sub>: {{ bdDatums.mur }}</label>
                      </q-item-label>
                      <div class="row justify-end">
                        <q-slider id="bd_mur_input" v-model="bdDatums.mur" :min="-bdSize[0]" :max="bdSize[0]" :step="1" markers />
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>
          </q-expansion-item>
          <q-expansion-item v-model="navMenu.state" group="main_nav" label="State" icon="o_extension" expand-separator >

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
