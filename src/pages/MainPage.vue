<script setup lang="ts">
import SVGGameBoard from 'components/SVGGameBoard.vue';
import { useStore } from 'src/model';
import { computed, ref } from 'vue';

defineOptions({
  name: 'MainPage',
});

const { bd, input, models } = useStore();

const inputValCount = computed(() => input.value.vals.filter(v => typeof v === 'number').length);

const navMenu = ref({
  structure: false,
  data: false,
  state: false,
  appearance: false,
});

const radiusLabels = {0: '0', 2: '2', 4: '4', 6: '6'};

const confirmSave = ref(false);
const confirmClear = ref(false);

const saveLevel = ref('');
const saveSize = ref('');
const saveId = ref('');

async function saveCSV() {
  const restInit = {
    method: 'POST',
    body: input.value.vals.join(','),
  };
  await fetch(`/api/csv/${ saveSize.value }/${ saveLevel.value }/${ saveId.value }`, restInit);
}

const saveLevelValues = [{ label: 'Easy', value: 'easy' }, { label: 'Normal', value: 'norm' }, { label: 'Hard', value: 'hard' }, { label: 'test', value: 'test' }];
const saveSizeValues = [{ label: 'Small', value: 'small' }, { label: 'Medium', value: 'med' }, { label: 'Large', value: 'large' }, { label: 'Huge', value: 'huge' }];


</script>

<template>
  <q-page class="q-pa-md">
    <div class="row page-row items-stretch justify-between">
      <div class="col view">
        <SVGGameBoard />
      </div>
      <div class="col-auto inputs">
        <q-list bordered>
          <q-expansion-item v-model="navMenu.structure" group="main_nav" label="Structure" icon="tune" expand-separator >
            <q-card flat>
              <q-card-section>
                <div class="row justify-start">
                  <label for="radius_input">Radius: {{ models.R }}</label>
                </div>
                <div class="row justify-end">
                  <q-slider id="radius_input" v-model="models.R.value" :min="0" :max="6" :step="1" snap label markers
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
                        <q-file id="backdrop_input" v-model="bd.file.value" filled name="backdrop" accept="image/*"
                                label="Choose photo"/>
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
              <q-separator inset />
              <q-card-section v-if="bd.file.value !== null">
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
                        <label for="nu0_input">&nu;<sub>0</sub>: {{ bd.models.nu0 }}</label>
                      </q-item-label>
                      <div class="row justify-end">
                        <q-slider id="nu0_input" v-model="bd.models.nu0.value" :min="-bd.size.value.height" :max="bd.size.value.height" :step="1" markers />
                      </div>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label>
                        <label for="nud_input">&nu;<sub>d</sub>: {{ bd.models.nud }}</label>
                      </q-item-label>
                      <div class="row justify-end">
                        <q-slider id="nud_input" v-model="bd.models.nud.value" :min="-bd.size.value.height" :max="bd.size.value.height" :step="1" markers />
                      </div>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label>
                        <label for="mur_input">&mu;<sub>r</sub>: {{ bd.models.mur }}</label>
                      </q-item-label>
                      <div class="row justify-end">
                        <q-slider id="mur_input" v-model="bd.models.mur.value" :min="-bd.size.value.width" :max="bd.size.value.width" :step="1" markers />
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
              <q-card-actions>
                <q-btn label="Clear" @click="confirmClear = true" />
                <q-space />
                <q-btn label="Save" @click="confirmSave = true" color="primary" :disabled="inputValCount === 0" />
              </q-card-actions>
            </q-card>
          </q-expansion-item>
          <q-expansion-item v-model="navMenu.state" group="main_nav" label="State" icon="o_extension" expand-separator >

          </q-expansion-item>
          <q-expansion-item v-model="navMenu.appearance" group="main_nav" label="Appearance" icon="o_shape_line" expand-separator >

          </q-expansion-item>
        </q-list>
      </div>
    </div>

    <q-dialog v-model="confirmSave" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">File details:</div>
        </q-card-section>

        <q-card-section>
          <q-list>
            <q-item>
              <q-item-section>
                <q-item-label>
                  <label for="saveSizeInput">Board size:</label>
                </q-item-label>
                <q-select id="saveSizeInput" v-model="saveSize" :options="saveSizeValues" emit-value label="Board size"></q-select>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label>
                  <label for="saveLevelInput">Difficulty level:</label>
                </q-item-label>
                <q-select id="saveLevelInput" v-model="saveLevel" :options="saveLevelValues" emit-value label="Difficulty level"></q-select>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label>
                  <label for="saveIdInput">Puzzle id:</label>
                </q-item-label>
                <q-input id="saveIdInput" v-model="saveId"></q-input>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn label="Cancel" v-close-popup />
          <q-space></q-space>
          <q-btn label="Confirm" color="primary" @click="saveCSV" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
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
