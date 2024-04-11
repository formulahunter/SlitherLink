<script setup lang="ts">
import { ref } from 'vue';
import { initBoard } from "src/gen";

defineOptions({
  name: 'MainPage'
});

const radiusLabels = {0: '0', 2: '2', 4: '4', 6: '6'};

const radius = ref(3);

function generateBoard() {
  // debounce form submit:
  // - deactivate submit button
  // - indicate pending status, i.e. loading spinner

  // get radius
  // get seed

  console.log(`generating game board with radius \`${radius.value}\``);

  // spawn new values & replace existing in cells
  const board = initBoard(radius.value);
  ///@ts-ignore
  window.board = board;

  // reset all cell/line/node states
}

</script>

<template>
  <q-page class="q-pa-md">
    <div class="row page-row items-stretch justify-between">
      <div class="col view">
        <svg viewbox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        </svg>
      </div>
      <div class="col-auto inputs">
        <q-form @submit="generateBoard">
          <q-card square>
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
              <q-btn type="submit" label="Generate"></q-btn>
            </q-card-actions>
          </q-card>
        </q-form>
      </div>
    </div>
  </q-page>
</template>

<style lang="sass">
.q-page
  margin: 0
  //background: rgba(#000, 0.25)
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
  aspect-ratio: 1.6

.radius-input
  width: 12rem
</style>
