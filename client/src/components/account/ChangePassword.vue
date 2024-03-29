<template>
	<q-form ref="form" class="change-password" @submit="onSubmit">
		<h3>Change Password</h3>
		<q-input
			ref="currentPasswordField"
			v-model="currentPassword"
			label="Current password"
			auto
			type="password"
			:rules="[
				$rules.required('This field is required.'),
			]"
			@focus="onCurrentPasswordFocus"
		>
			<template v-slot:prepend>
				<q-icon name="password" />
			</template>
		</q-input>
		<q-input
			v-model="newPassword"
			label="New password"
			type="password"
			:rules="[
				$rules.required('This field is required.'),
			]"
		>
			<template v-slot:prepend>
				<q-icon name="password" />
			</template>
		</q-input>
		<q-input
			v-model="confirmNewPassword"
			label="Confirm new password"
			type="password"
			:rules="[
				$rules.required('This field is required.'),
        $rules.sameAs(newPassword, 'Passwords do not match.'),
			]"
		>
			<template v-slot:prepend>
				<q-icon name="password" />
			</template>
		</q-input>
		<div class="change-password__button-bar">
			<q-btn
				label="Change password"
				type="submit"
				color="primary"
        :disabled="!isValid"
			/>
		</div>
		<q-inner-loading :showing="loading" />
	</q-form>
</template>

<script lang="ts">
import { QForm, QInput } from 'quasar';
import { notifyError, notifySuccess } from 'src/common/notify';
import { Options, Vue } from 'vue-class-component';

@Options({
	name: 'ChangePassword',
})
export default class ChangePassword extends Vue {
	currentPassword = ' '; // single space to prevent autofill
	newPassword = '';
  confirmNewPassword = '';

	loading = false;

	onCurrentPasswordFocus() {
		(this.$refs.currentPasswordField as QInput).select();
	}

  get isValid(): boolean {
    return !!this.currentPassword.trim() && !!this.newPassword && this.confirmNewPassword === this.newPassword;
  }

	async onSubmit() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const form = this.$refs.form as QForm;

    if (!(await form.validate())) {
      return;
    }

		this.loading = true;

		try {
			await this.$api.user.changePassword({
				currentPassword: this.currentPassword,
				newPassword: this.newPassword,
			});

			notifySuccess('Password has been changed.');
		} catch (e) {
      notifyError(e);
    } finally {
      this.loading = false;
    }
	}
}
</script>

<style lang="scss">
.change-password {
  max-width: 500px;
}

.change-password__button-bar {
	text-align: right;
}
</style>
