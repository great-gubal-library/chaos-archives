<template>
  <q-page class="page-edit-community">
    <template v-if="loaded">
      <h2>{{ communityId ? 'Edit Community' : 'Create Community' }}</h2>
      <q-form ref="form" @submit="onSubmit">
        <template v-if="!preview">
          <section class="page-edit-community__form-controls">
            <q-input
              v-model="community.name"
              label="Name *"
              :rules="[
                $rules.required('This field is required.'),
              ]"
            />
            <q-input
              class="page-edit-community__founded-at"
              label="Founded"
              :model-value="foundedAtDisplay"
              readonly
              :rules="[
                $rules.required('This field is required.'),
              ]"
            >
              <template v-slot:append>
                <template v-if="community.foundedAt">
                  <q-icon name="clear" class="cursor-pointer" @click="community.foundedAt = null" />&nbsp;
                </template>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy ref="qDateProxy" cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="community.foundedAt" mask="YYYY-MM-DD">
                      <div class="row items-center justify-end">
                        <q-btn v-close-popup label="Close" color="primary" flat />
                      </div>
                    </q-date>
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
            <q-input
              v-model="community.website"
              label="Website"
              :rules="[
                $rules.url('Please enter a link.'),
              ]"
            />
            <q-input
              v-model="community.discord"
              label="Discord link"
              :rules="[
                $rules.url('Please enter a link.'),
              ]"
            />
            <q-input
              v-model="community.goal"
              label="Goal"
            />
            <q-input
              v-model="community.status"
              label="Status"
            />
            <q-input
              v-model="community.recruitingOfficers"
              label="Recruiting officers"
            />
            <div class="text-caption">You can use [[wikilinks]], e.g. [[Character Name]], in goal, status, and recruiting officers.</div>
            <q-input
              :model-value="tags"
              @update:model-value="onTagsChanged"
              label="Tags (comma-separated)"
            />
          </section>
          <banner-edit-section v-model="community.banner" />
          <h6>Description</h6>
          <html-editor :editor-id="`community-description-${community.id}`" v-model="community.description" />
          <carrd-edit-section
            class="page-edit-community__form-controls"
            entity-type="community"
            v-model="community.carrdProfile"
          />
        </template>
        <section v-else class="page-edit-community__preview">
          <community-profile :community="community" :preview="true" />
        </section>
        <div class="page-edit-community__button-bar">
          <q-btn-toggle
            v-model="preview"
            :options="previewOptions"
            toggle-color="secondary"
          />
          <div class="page-edit-community__revert-submit">
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
import { CommunityDto } from '@app/shared/dto/communities/community.dto';
import { MembershipStatus } from '@app/shared/enums/membership-status.enum';
import errors from '@app/shared/errors';
import SharedConstants from '@app/shared/shared-constants';
import HtmlEditor from 'components/common/HtmlEditor.vue';
import { useApi } from 'src/boot/axios';
import { notifyError, notifySuccess } from 'src/common/notify';
import BannerEditSection from 'src/components/common/BannerEditSection.vue';
import CarrdEditSection from 'src/components/common/CarrdEditSection.vue';
import CommunityProfile from 'src/components/communities/CommunityProfile.vue';
import { useRouter } from 'src/router';
import { useStore } from 'src/store';
import { Options, Vue } from 'vue-class-component';
import { RouteParams } from 'vue-router';

const $api = useApi();
const $store = useStore();
const $router = useRouter();

async function load(params: RouteParams): Promise<CommunityDto|null> {
	const id = parseInt(params.id as string, 10);

	if (!id) {
		return null;
	}

	try {
		return await $api.communities.getCommunity(id, $store.getters.characterId!);
	} catch (e) {
		if (errors.getStatusCode(e) === 404) {
			notifyError('Community not found.');
		} else {
			notifyError(errors.getMessage(e));
		}

    void $router.replace('/');
		throw e;
	}
}

@Options({
  name: 'PageEditCommunity',
  components: {
    CommunityProfile,
    HtmlEditor,
    BannerEditSection,
    CarrdEditSection,
  },
	async beforeRouteEnter(to, _, next) {
		const content = await load(to.params);
		next(vm => (vm as PageEditCommunity).setContent(content));
	},
	async beforeRouteUpdate(to) {
		(this as PageEditCommunity).setContent(await load(to.params));
	},
})
export default class PageEditCommunity extends Vue {
  readonly previewOptions = [
    { label: 'Edit', value: false },
    { label: 'Preview', value: true },
  ];

  readonly SharedConstants = SharedConstants;

	communityId: number|null = null;
  community = new CommunityDto();
  communityBackup = new CommunityDto();

  preview = false;
  loaded = false;
  saving = false;

  confirmRevert = false;

  setContent(community: CommunityDto|null) {
		if (community) {
			this.communityId = community.id;
			this.communityBackup = new CommunityDto(community);
    } else {
      this.communityId = null;
      this.communityBackup = new CommunityDto({
        id: null as unknown as number,
        mine: true,
        membershipStatus: MembershipStatus.CONFIRMED,
        canEdit: true,
        canManageMembers: true,
        foundedAt: null,
        name: '',
        owner: this.$store.getters.character!.name,
        ownerServer: this.$store.getters.character!.server,
        region: this.$store.getters.character!.region,
        description: '',
        website: '',
        discord: '',
        goal: '',
        recruitingOfficers: '',
        status: '',
        carrdProfile: '',
        banner: null,
        tags: []
      });
    }

    this.loaded = true;
    this.community = new CommunityDto(this.communityBackup);
  }

  get foundedAtDisplay() {
    return this.community.foundedAt ? this.$display.formatDate(this.community.foundedAt) : '(Unknown)';
  }

  get tags() {
    return this.community.tags.join(', ');
  }

  onTagsChanged(newTags: string) {
    this.community.tags = newTags.split(/,\s*/).map((tag) => tag.trim()).filter(tag => tag !== '');
  }

  revert() {
    this.confirmRevert = true;
  }

  onConfirmRevert() {
    this.community = new CommunityDto(this.communityBackup);
  }

  async onSubmit() {
    this.saving = true;

    try {
      if (!this.communityId) {
        const result = await this.$api.communities.createCommunity(this.community);
        this.community.id = result.id;
        this.communityId = result.id;
        void this.$router.replace(`/edit-community/${result.id}`);
      } else {
        await this.$api.communities.editCommunity(this.community);
      }

      this.communityBackup = new CommunityDto(this.community);

      notifySuccess('Community saved.', {
        label: 'View',
        color: 'white',
        handler: () => this.viewCommunity(),
      });
    } catch (e) {
      notifyError(e);
    } finally {
      this.saving = false;
    }
  }

  viewCommunity() {
    if (this.community.name) {
      void this.$router.push(`/community/${this.community.name}`);
    }
  }
}
</script>

<style lang="scss">
.page-edit-community__form-controls {
  max-width: 500px;
  flex-basis: 0;
  flex-grow: 1;
}

.q-field--standard.q-field--readonly.page-edit-community__founded-at .q-field__control::before {
  border-bottom-style: solid;
}

.page-edit-community__preview {
  margin-bottom: 24px;
}

.page-edit-community__button-bar {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  margin-bottom: 16px;
}

.page-edit-community__preview h6 {
  font-family: $header-font;
}
</style>
