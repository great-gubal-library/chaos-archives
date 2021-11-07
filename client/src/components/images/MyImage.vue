<template>
	<q-card class="my-image">
			<q-card-section>
				<template v-if="!editing">
					<div class="flex">
						<div class="my-image__thumb-column"><a class="thumb-link" :href="image.url" target="_blank"><img :src="image.thumbUrl" /></a></div>
						<div class="my-image__description-column">
							<div>
								<h5>{{image.category !== ImageCategory.UNLISTED ? image.title : 'Unlisted Image'}}</h5>
								<section v-html="description"></section>
							</div>
							<div class="text-right">
								<q-btn flat color="primary" label="Edit" @click="onEditClick" />
								<q-btn flat color="negative" label="Delete" @click="onDeleteClick" />
							</div>
						</div>
					</div>
				</template>
				<template v-else>
					<a class="thumb-link" :href="image.url" target="_blank"><img :src="image.thumbUrl" /></a>
					<step-image-details v-model="imageDescription" />
				</template>
			</q-card-section>
			<q-card-actions v-if="editing" align="right">
				<q-btn flat color="secondary" label="Cancel" @click="editing = false" />
				<q-btn flat :disable="!isValid" color="primary" label="Save" @click="onSaveClick" />
			</q-card-actions>
			<q-inner-loading v-if="saving" />
		</q-card>
</template>

<script lang="ts">
import { Options, prop, Vue } from 'vue-class-component';
import { ImageDto } from '@app/shared/dto/image/image.dto';
import html from '@app/shared/html';
import { ImageCategory } from '@app/shared/enums/image-category.enum';
import StepImageDetails from '../upload/StepImageDetails.vue';
import { ImageDescriptionDto } from '@app/shared/dto/image/image-desciption.dto';
import errors from '@app/shared/errors';

class Props {
	image = prop<ImageDto>({
		required: true
	})
}

@Options({
	name: 'MyImage',
	components: {
		StepImageDetails
	},
	emits: [ 'saved', 'deleted' ]
})
export default class MyImage extends Vue.with(Props) {
	readonly ImageCategory = ImageCategory;
	imageDescription = new ImageDescriptionDto();
	editing = false;
	saving = false;

	get description() {
		return html.sanitize(this.image.description);
	}

	get isValid() {
		return (this.imageDescription.category === ImageCategory.UNLISTED || !!this.imageDescription.title)
      && !!this.imageDescription.credits;
	}

	async onDeleteClick() {
		const ConfirmImageDeleteDialog = (await import('./ConfirmImageDeleteDialog.vue')).default;

		this.$q.dialog({
			component: ConfirmImageDeleteDialog,
			componentProps: {
				image: this.image
			}
		}).onOk(() => {
			this.$emit('deleted', this.image);
		});
	}

	onEditClick() {
		this.imageDescription = new ImageDescriptionDto({
			title: this.image.title,
			description: this.image.description,
			category: this.image.category,
			credits: this.image.credits
		});
		this.editing = true;
	}

	async onSaveClick() {
		try {
      this.saving = true;

      await this.$api.saveImage(this.image.id, this.imageDescription);
			Object.assign(this.image, this.imageDescription);
			this.editing = false;
			this.$emit('saved', this.image);

      this.$q.notify({
        message: 'Changes saved.',
        type: 'positive',
      });
    } catch (e) {
      this.$q.notify({
        message: errors.getMessage(e),
        type: 'negative',
      });
    } finally {
      this.saving = false;
    }
	}
}
</script>

<style lang="scss">
.my-image {
	margin-bottom: 16px;
}

.my-image__thumb-column {
	padding-right: 16px;
}

.my-image__description-column {
	flex-grow: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}
</style>