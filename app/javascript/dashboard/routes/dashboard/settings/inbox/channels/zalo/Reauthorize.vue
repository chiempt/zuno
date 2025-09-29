<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import InboxReconnectionRequired from '../../components/InboxReconnectionRequired.vue';
import InboxesAPI from '../../../../../../api/inboxes';

const props = defineProps({
    inbox: {
        type: Object,
        required: true,
    },
});

const { t } = useI18n();

const isRequestingAuthorization = ref(false);

const reauthorizeZalo = async () => {
    isRequestingAuthorization.value = true;

    try {
        // Generate new QR code
        const response = await InboxesAPI.generateZaloQRCode({
            imei: props.inbox.channel.imei,
            userAgent: props.inbox.channel.user_agent,
        });

        if (response.data.success) {
            useAlert(t('INBOX.REAUTHORIZE.SUCCESS'));

            // Update inbox with new QR code
            await InboxesAPI.update(props.inbox.id, {
                channel: {
                    qr_code: response.data.qr_code,
                },
            });
        } else {
            useAlert(response.data.error || t('INBOX.REAUTHORIZE.ERROR'));
        }
    } catch (error) {
        useAlert(error.message || t('INBOX.REAUTHORIZE.ERROR'));
    } finally {
        isRequestingAuthorization.value = false;
    }
};

// Expose reauthorize function for parent components
defineExpose({
    requestAuthorization: reauthorizeZalo,
});
</script>

<template>
    <InboxReconnectionRequired class="mx-8 mt-5" :is-loading="isRequestingAuthorization"
        @reauthorize="reauthorizeZalo" />
</template>
