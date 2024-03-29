<template>
  <q-page class="page-edit-venue">
    <template v-if="loaded">
      <h2>{{ venueId ? 'Edit Venue' : 'Create Venue' }}</h2>
      <q-form ref="form" @submit="onSubmit">
        <template v-if="!preview">
          <section class="page-edit-venue__form-controls">
            <q-input
              v-model="venue.name"
              label="Name *"
              :rules="[
                $rules.required('This field is required.'),
              ]"
            />
            <world-select
              v-model="venue.server"
              label="World *"
              :rules="[
                $rules.required('This field is required.'),
              ]"
            />
            <q-input
              class="page-edit-venue__founded-at"
              label="Founded"
              :model-value="foundedAtDisplay"
              readonly
              :rules="[
                $rules.required('This field is required.'),
              ]"
            >
              <template v-slot:append>
                <template v-if="venue.foundedAt">
                  <q-icon name="clear" class="cursor-pointer" @click="venue.foundedAt = null" />&nbsp;
                </template>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy ref="qDateProxy" cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="venue.foundedAt" mask="YYYY-MM-DD">
                      <div class="row items-center justify-end">
                        <q-btn v-close-popup label="Close" color="primary" flat />
                      </div>
                    </q-date>
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
            <q-input
              v-model="venue.website"
              label="Website"
              :rules="[
                $rules.url('Please enter a link.'),
              ]"
            />
            <q-input
              v-model="venue.purpose"
              label="Purpose"
            />
            <q-input
              v-model="venue.status"
              label="Status"
            />
            <div class="text-caption">You can use [[wikilinks]], e.g. [[Character Name]], in purpose and status.</div>
            <q-input
              :model-value="tags"
              @update:model-value="onTagsChanged"
              label="Tags (comma-separated)"
            />
            <h6>Location</h6>
            <q-option-group
              inline
              v-model="venue.location"
              :options="locationOptions"
              @update:model-value="onLocationUpdated"
            />
            <template v-if="venue.location === VenueLocation.OPEN_WORLD">
              <q-input
                v-model="venue.address"
                label="Address *"
                :rules="[
                  $rules.required('This field is required.'),
                ]"
              />
            </template>
            <template v-else>
              <q-select
                label="Housing area *"
                v-model="venue.housingArea"
                :options="housingAreaOptions"
                emit-value
                map-options
                :rules="[
                  $rules.required('This field is required.'),
                ]"
              />
              <q-input
                class="page-edit-venue__number-input"
                v-model.number="venue.ward"
                label="Ward *"
                :rules="[
                  $rules.required('This field is required.'),
                  $rules.integer('Please enter a number.'),
                  $rules.minValue(SharedConstants.housing.MIN_WARD_NUMBER, `Ward number cannot be less than ${SharedConstants.housing.MIN_WARD_NUMBER}.`),
                  $rules.maxValue(SharedConstants.housing.MAX_WARD_NUMBER, `Ward number cannot be greater than ${SharedConstants.housing.MAX_WARD_NUMBER}.`),
                ]"
              />
              <template v-if="venue.location === VenueLocation.HOUSE">
                <q-input
                class="page-edit-venue__number-input"
                  v-model.number="venue.plot"
                  label="Plot *"
                  :rules="[
                    $rules.required('This field is required.'),
                    $rules.integer('Please enter a number.'),
                    $rules.minValue(SharedConstants.housing.MIN_MAIN_WARD_PLOT, `Plot number cannot be less than ${SharedConstants.MIN_MAIN_WARD_PLOT}.`),
                    $rules.maxValue(SharedConstants.housing.MAX_SUBDIVISION_PLOT, `Plot number cannot be greater than ${SharedConstants.housing.MAX_SUBDIVISION_PLOT}.`),
                  ]"
                  @update:model-value="onPlotUpdated"
                />
                <q-checkbox :model-value="venue.subdivision" label="Subdivision" disable />
              </template>
              <template v-else-if="venue.location === VenueLocation.APARTMENT">
                <q-input
                  v-model="venue.room"
                  label="Room *"
                  :rules="[
                    $rules.required('This field is required.'),
                    (val) => parseInt(val, 10) >= SharedConstants.housing.MIN_APARTMENT_NUMBER || `Room number cannot be less than ${SharedConstants.housing.MIN_APARTMENT_NUMBER}.`,
                    (val) => parseInt(val, 10) <= SharedConstants.housing.MAX_APARTMENT_NUMBER || `Room number cannot be greater than ${SharedConstants.housing.MAX_APARTMENT_NUMBER}.`,
                  ]"
                />
                <q-checkbox v-model="venue.subdivision" label="Subdivision" />
              </template>
            </template>
          </section>
          <banner-edit-section v-model="venue.banner" />
          <h6>Description</h6>
          <html-editor :editor-id="`venue-description-${venue.id}`" v-model="venue.description" />
          <carrd-edit-section
            class="page-edit-venue__form-controls"
            entity-type="venue"
            v-model="venue.carrdProfile"
          />
        </template>
        <section v-else class="page-edit-venue__preview">
          <venue-profile :venue="venue" :preview="true" />
        </section>
        <div class="page-edit-venue__button-bar">
          <q-btn-toggle
            v-model="preview"
            :options="previewOptions"
            toggle-color="secondary"
          />
          <div class="page-edit-venue__revert-submit">
            <q-btn label="Revert" color="secondary" @click="revert" />&nbsp;
            <q-btn label="Save changes" type="submit" color="primary" />
          </div>
        </div>
        <q-inner-loading :showing="saving" />
      </q-form>
    </template>
    <q-spinner v-else />

    <q-dialog v-model="confirmRevert" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <span class="q-ml-sm"
            >Do you want to revert your unsaved changes to the last saved
            version?</span
          >
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Keep editing" color="secondary" v-close-popup />
          <q-btn
            flat
            label="Revert"
            color="negative"
            v-close-popup
            @click="onConfirmRevert"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script lang="ts">
import { VenueDto } from '@app/shared/dto/venues/venue.dto';
import { HousingArea } from '@app/shared/enums/housing-area.enum';
import { VenueLocation } from '@app/shared/enums/venue-location.enum';
import errors from '@app/shared/errors';
import SharedConstants from '@app/shared/shared-constants';
import HtmlEditor from 'components/common/HtmlEditor.vue';
import { useApi } from 'src/boot/axios';
import { notifyError, notifySuccess } from 'src/common/notify';
import BannerEditSection from 'src/components/common/BannerEditSection.vue';
import CarrdEditSection from 'src/components/common/CarrdEditSection.vue';
import WorldSelect from 'src/components/common/WorldSelect.vue';
import VenueProfile from 'src/components/venues/VenueProfile.vue';
import { useRouter } from 'src/router';
import { Options, Vue } from 'vue-class-component';
import { RouteParams } from 'vue-router';

const $api = useApi();
const $router = useRouter();

async function load(params: RouteParams): Promise<VenueDto|null> {
	const id = parseInt(params.id as string, 10);

	if (!id) {
		return null;
	}

	try {
		const venue = await $api.venues.getVenue(id);
		return venue;
	} catch (e) {
		if (errors.getStatusCode(e) === 404) {
			notifyError('Venue not found.');
		} else {
			notifyError(errors.getMessage(e));
		}

    void $router.replace('/');
		throw e;
	}
}

@Options({
  name: 'PageEditVenue',
  components: {
    VenueProfile,
    HtmlEditor,
    BannerEditSection,
    CarrdEditSection,
    WorldSelect,
  },
	async beforeRouteEnter(to, _, next) {
		const content = await load(to.params);
		next(vm => (vm as PageEditVenue).setContent(content));
	},
	async beforeRouteUpdate(to) {
		(this as PageEditVenue).setContent(await load(to.params));
	},
})
export default class PageEditVenue extends Vue {
  readonly previewOptions = [
    { label: 'Edit', value: false },
    { label: 'Preview', value: true },
  ];

  readonly VenueLocation = VenueLocation;

  readonly SharedConstants = SharedConstants;

	venueId: number|null = null;
  venue = new VenueDto();
  venueBackup = new VenueDto();

  preview = false;
  loaded = false;
  saving = false;

  confirmRevert = false;

  setContent(venue: VenueDto|null) {
		if (venue) {
			this.venueId = venue.id;
			this.venueBackup = new VenueDto(venue);
    } else {
      this.venueId = null;
      this.venueBackup = new VenueDto({
        id: null as unknown as number,
        mine: true,
        foundedAt: null,
        name: '',
        server: this.$store.getters.character!.server,
        owner: this.$store.getters.character!.name,
        ownerServer: this.$store.getters.character!.server,
        description: '',
        website: '',
        purpose: '',
        status: '',
        location: VenueLocation.OPEN_WORLD,
        address: '',
        housingArea: null,
        ward: null,
        plot: null,
        room: null,
        subdivision: false,
        carrdProfile: '',
        banner: null,
        tags: []
      });
    }

    this.loaded = true;
    this.venue = new VenueDto(this.venueBackup);
  }

  get foundedAtDisplay() {
    return this.venue.foundedAt ? this.$display.formatDate(this.venue.foundedAt) : '(Unknown)';
  }

  get tags() {
    return this.venue.tags.join(', ');
  }

  onTagsChanged(newTags: string) {
    this.venue.tags = newTags.split(/,\s*/).map((tag) => tag.trim()).filter(tag => tag !== '');
  }

  get locationOptions() {
    return Object.values(VenueLocation).map(location => ({
      label: this.$display.venueLocations[location],
      value: location
    }));
  }

  get housingAreaOptions() {
    return Object.values(HousingArea).map(housingArea => ({
      label: this.$display.housingAreas[housingArea],
      value: housingArea
    }));
  }

  onLocationUpdated() {
    if (this.venue.location !== VenueLocation.OPEN_WORLD && !this.venue.subdivision) {
      this.venue.subdivision = false;
    }

    this.onPlotUpdated();
  }

  onPlotUpdated() {
    if (this.venue.location === VenueLocation.HOUSE) {
      this.venue.subdivision = !!this.venue.plot && this.venue.plot >= SharedConstants.housing.MIN_SUBDIVISION_PLOT;
    }
  }

  revert() {
    this.confirmRevert = true;
  }

  onConfirmRevert() {
    this.venue = new VenueDto(this.venueBackup);
  }

  async onSubmit() {
    this.saving = true;

    try {
      if (!this.venueId) {
        const result = await this.$api.venues.createVenue(this.venue);
        this.venue.id = result.id;
        this.venueId = result.id;
        void this.$router.replace(`/edit-venue/${result.id}`);
      } else {
        await this.$api.venues.editVenue(this.venue);
      }

      this.venueBackup = new VenueDto(this.venue);

      notifySuccess('Venue saved.', {
        label: 'View',
        color: 'white',
        handler: () => this.viewVenue(),
      });
    } catch (e) {
      notifyError(e);
    } finally {
      this.saving = false;
    }
  }

  viewVenue() {
    if (this.venueId) {
      void this.$router.push(`/venue/${this.venueId}`);
    }
  }
}
</script>

<style lang="scss">
.page-edit-venue__form-controls {
  max-width: 500px;
  flex-basis: 0;
  flex-grow: 1;
}

.q-field--standard.q-field--readonly.page-edit-venue__founded-at .q-field__control::before {
  border-bottom-style: solid;
}

.page-edit-venue__preview {
  margin-bottom: 24px;
}

.page-edit-venue__button-bar {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  margin-bottom: 16px;
}

.page-edit-venue__preview h6 {
  font-family: $header-font;
}
</style>
