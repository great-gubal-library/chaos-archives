<template>
  <div class="character-profile">
    <p v-if="!preview && character.mine">
      <router-link :to="`/edit-character/${character.id}`">Edit profile</router-link>
    </p>
    <banner-view :banner="character.banner" />
    <header class="character-profile__header">
      <div class="layout__filler">
        <q-avatar v-if="character.showAvatar" round>
          <img :src="character.avatar" />
        </q-avatar>
      </div>
      <div class="character-profile__header-names">
        <div v-if="character.title" class="character-profile__header-subtitle">{{ character.title }}</div>
        <h2 class="character-profile__header-title">{{ character.name }}</h2>
        <div v-if="character.nickname" class="character-profile__header-subtitle">«{{ character.nickname }}»</div>
      </div>
      <div class="layout__filler"></div>
    </header>
    <character-details-box v-if="character.showInfoboxes">
      <character-detail label="World" :value="character.server" v-if="character.server" />
      <character-detail label="Race" :value="$display.races[character.race]" v-if="character.race" />
      <character-detail label="Occupation" :value="character.occupation" v-if="character.occupation" />
      <character-detail label="Age" :value="character.age" v-if="character.age" />
      <character-detail label="Nationality" :value="character.nationality" v-if="character.nationality" />
      <character-detail label="Pronouns" :value="character.pronouns" v-if="character.pronouns" />
      <character-detail label="Birthplace" :value="character.birthplace" v-if="character.birthplace" />
      <character-detail label="Residence" :value="character.residence" v-if="character.residence" />
      <character-detail label="Free&nbsp;Company" :value="character.freeCompany.name" :router-link="fcLink" v-if="character.freeCompany" />
      <character-detail label="Player" :value="character.player.name" :router-link="playerLink" v-if="character.player" />
    </character-details-box>
    <template v-if="character.appearance">
      <h3 v-if="!character.combinedDescription">Outward appearance</h3>
      <html-viewer
        class="character-profile__appearance-background"
        :class="{ 'character-profile__appearance-background_no-header': character.combinedDescription }"
        :content="character.appearance"
      />
    </template>
    <template v-if="!character.combinedDescription">
      <template v-if="character.background"><hr /></template>
      <template v-if="character.background">
        <h3>Background</h3>
        <html-viewer class="character-profile__appearance-background" :content="character.background" />
      </template>
    </template>
    <template v-if="!character.appearance && (character.combinedDescription || !character.background)">
      &nbsp;
    </template>
    <character-details-box
      v-if="character.showInfoboxes && hasPersonalityBox"
      class="character-profile__personality-box"
    >
      <character-detail label="Friends" :value="character.friends" v-if="character.friends" />
      <character-detail label="Relatives" :value="character.relatives" v-if="character.relatives" />
      <character-detail label="Rivals/Enemies" :value="character.enemies" v-if="character.enemies" />
      <character-detail label="Loves" :value="character.loves" v-if="character.loves" />
      <character-detail label="Hates" :value="character.hates" v-if="character.hates" />
      <character-detail label="Motto" :value="character.motto" v-if="character.motto" />
      <character-detail label="Motivation" :value="character.motivation" v-if="character.motivation" />
    </character-details-box>
    <iframe
      v-if="character.carrdProfile"
      v-iframe-resize
      :src="carrdLink"
      width="100%"
      height="500px"
      class="character-profile__carrd-iframe"
    >
    </iframe>
  </div>
</template>

<script lang="ts">
import { CharacterProfileDto } from '@app/shared/dto/characters/character-profile.dto';
import { PageType } from '@app/shared/enums/page-type.enum';
import { Options, prop, Vue } from 'vue-class-component';
import BannerView from '../common/BannerView.vue';
import HtmlViewer from '../common/HtmlViewer.vue';
import ReportViolationSection from '../common/ReportViolationSection.vue';
import CharacterDetail from './CharacterDetail.vue';
import CharacterDetailsBox from './CharacterDetailsBox.vue';
import { wikify } from '@common/common/wikilinks';

class Props {
  character = prop<CharacterProfileDto>({
    required: true,
  });

  preview = prop<boolean>({
    default: false,
  });
}

@Options({
  components: {
    CharacterDetail,
    CharacterDetailsBox,
    BannerView,
    HtmlViewer,
    ReportViolationSection,
  },
})
export default class CharacterProfile extends Vue.with(Props) {
  PageType = PageType;

  get fcLink() {
    const fc = this.character.freeCompany;
		return fc == null ? null : `/fc/${fc.server}/${wikify(fc.name)}`;
  }

get playerLink() {
  const player = this.character.player;
  return player == null ? null : `/player/${player.id}/${wikify(player.name)}`;
}

  get hasPersonalityBox(): boolean {
    return !!(this.character.loves || this.character.hates || this.character.motto || this.character.motivation);
  }

  get carrdLink(): string {
    if (this.preview) {
      return `${this.$api.prefix}carrd/character/preview/${this.character.carrdProfile}`;
    }

    return `${this.$api.prefix}carrd/character/${this.character.id}`;
  }
}
</script>

<style lang="scss">
@import url($extraGoogleFonts);

.character-profile__header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.character-profile__header-title {
  margin: 0;
  line-height: auto;
}

.character-profile__header-names {
  text-align: center;
}

.character-profile__header-subtitle {
  font-family: $header-font;
  font-size: 1.6em;
}

.character-profile__details td {
  padding: 4px 8px;
}

.character-profile__details tr > td:first-child {
  font-weight: bold;
}

.character-profile__appearance-background {
  margin-bottom: 24px;
}

.character-profile__appearance-background_no-header {
  margin-top: 24px;
}

.character-profile__personality-box {
  margin-bottom: 24px;
}

.character-profile__carrd-iframe {
  border: none;
}
</style>
