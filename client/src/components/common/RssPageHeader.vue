<template>
  <header class="rss-page-header">
    <div class="layout__filler"></div>
    <h2><slot /></h2>
    <div class="layout__filler rss-page-header__feed-container">
      <rss-button :feed-link="feedLink" />
    </div>
  </header>
</template>

<script lang="ts">
import { Options, prop, Vue } from 'vue-class-component';
import RssButton from './RssButton.vue';

class Props {
  feedLink = prop<string>({
    required: true,
  });
}

@Options({
  name: 'RssPageHeader',
  components: {
    RssButton,
  },
})
export default class RssPageHeader extends Vue.with(Props) {

}
</script>

<style lang="scss">
.rss-page-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.rss-page-header h2 {
  margin: 0;
  line-height: auto;
}

.rss-page-header__feed-container {
  display: flex;
  justify-content: end;
}
</style>
