<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import SettingsSection from '../../../../../../components/SettingsSection.vue';
import NextButton from 'dashboard/components-next/button/Button.vue';
import InboxesAPI from '../../../../../../api/inboxes';

const props = defineProps({
    inbox: {
        type: Object,
        required: true,
    },
});

const { t } = useI18n();

const userAgent = ref('');
const proxy = ref('');
const qrCode = ref('');
const qrCodeExpiresAt = ref(null);
const channelLastUpdated = ref(null);
const qrCodeTimer = ref(null);
const isGeneratingQR = ref(false);
const isUpdating = ref(false);

const qrCodeUrl = computed(() => {
    return qrCode.value ? `${qrCode.value}` : null;
});

const qrCodeTimeLeft = computed(() => {
    if (!qrCodeExpiresAt.value) return 0;
    const now = new Date().getTime();
    const expires = new Date(qrCodeExpiresAt.value).getTime();
    return Math.max(0, Math.floor((expires - now) / 1000));
});

const qrCodeExpired = computed(() => {
    return qrCodeTimeLeft.value === 0;
});

const channelLastUpdatedFormatted = computed(() => {
    if (!channelLastUpdated.value) return null;
    const date = new Date(channelLastUpdated.value);
    return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
});

onMounted(() => {
    try {
        loadSettings();
        startQRCodeTimer();
    } catch (error) {
        console.error('Error in onMounted:', error);
        useAlert(t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
    }
});

onUnmounted(() => {
    clearQRCodeTimer();
});

// Watch for inbox changes
watch(() => props.inbox, () => {
    try {
        loadSettings();
    } catch (error) {
        console.error('Error in watcher:', error);
        useAlert(t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
    }
}, { deep: true, immediate: true });

const loadSettings = () => {
    try {
        // Ensure props.inbox exists before accessing its properties
        if (!props.inbox) {
            console.warn('Inbox prop is not available');
            return;
        }

        // Load with fallback values
        userAgent.value = props.inbox?.channel?.user_agent || navigator.userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';
        proxy.value = props.inbox?.channel?.proxy || '';
        qrCode.value = props.inbox?.channel?.qr_code || '';
        qrCodeExpiresAt.value = props.inbox?.channel?.qr_code_expires_at || null;
        channelLastUpdated.value = props.inbox?.channel?.updated_at || null;
    } catch (error) {
        console.error('Error loading settings:', error);
        throw error;
    }
};

const generateQRCode = async () => {
    if (isGeneratingQR.value) return;

    // Check if inbox exists
    if (!props.inbox?.id) {
        useAlert(t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
        return;
    }

    isGeneratingQR.value = true;
    try {
        const response = await InboxesAPI.generateZaloQRCode({
            imei: props.inbox?.channel?.imei || '35' + Math.random().toString().substr(2, 13),
            userAgent: userAgent.value,
        });

        if (response.data.success) {
            qrCode.value = response.data.qr_code;
            qrCodeExpiresAt.value = response.data.expires_at;
            startQRCodeTimer();

            // Update inbox with new QR code
            await InboxesAPI.updateZaloSettings(props.inbox.id, {
                qr_code: qrCode.value,
                qr_code_expires_at: qrCodeExpiresAt.value,
            });

            useAlert(t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_CODE.REGENERATE') + ' - Success');
        } else {
            throw new Error(response.data.error || 'Failed to generate QR code');
        }
    } catch (error) {
        console.error('Error generating QR code:', error);
        useAlert(error.message || t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_GENERATION_ERROR'));
    } finally {
        isGeneratingQR.value = false;
    }
};

const updateSettings = async () => {
    // Check if inbox exists
    if (!props.inbox?.id) {
        useAlert(t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
        return;
    }

    isUpdating.value = true;
    try {
        await InboxesAPI.updateZaloSettings(props.inbox.id, {
            user_agent: userAgent.value,
            proxy: proxy.value,
        });

        useAlert(t('INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'));
    } catch (error) {
        console.error('Error updating settings:', error);
        useAlert(error.message || t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
    } finally {
        isUpdating.value = false;
    }
};

const startQRCodeTimer = () => {
    clearQRCodeTimer();
    qrCodeTimer.value = setInterval(() => {
        if (qrCodeTimeLeft.value <= 0) {
            clearQRCodeTimer();
            generateQRCode();
        }
    }, 1000);
};

const clearQRCodeTimer = () => {
    if (qrCodeTimer.value) {
        clearInterval(qrCodeTimer.value);
        qrCodeTimer.value = null;
    }
};
</script>

<template>
    <div class="mx-8">
        <SettingsSection :title="$t('INBOX_MGMT.ADD.ZALO_PERSONAL.TITLE')"
            :sub-title="$t('INBOX_MGMT.ADD.ZALO_PERSONAL.DESC')" :show-border="false">
            <!-- User Agent -->
            <div class="pb-4">
                <label class="block mb-2 text-sm font-medium text-gray-700">
                    {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.USER_AGENT.LABEL') }}
                </label>
                <input v-model="userAgent" type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    :placeholder="$t('INBOX_MGMT.ADD.ZALO_PERSONAL.USER_AGENT.PLACEHOLDER')" />
            </div>

            <!-- Proxy -->
            <div class="pb-4">
                <label class="block mb-2 text-sm font-medium text-gray-700">
                    {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.PROXY.LABEL') }}
                </label>
                <input v-model="proxy" type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    :placeholder="$t('INBOX_MGMT.ADD.ZALO_PERSONAL.PROXY.PLACEHOLDER')" />
                <p class="mt-1 text-sm text-gray-500">
                    {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.PROXY.HELP_TEXT') }}
                </p>
            </div>

            <!-- QR Code Section -->
            <div class="pb-4">
                <h4 class="text-lg font-semibold mb-2">
                    {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_CODE.TITLE') }}
                </h4>
                <p class="text-sm text-gray-600 mb-4">
                    {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_CODE.DESCRIPTION') }}
                </p>

                <div class="flex justify-center items-center min-h-[200px]">
                    <div v-if="qrCodeUrl && !isGeneratingQR" class="text-center">
                        <div class="relative inline-block mb-4">
                            <img :src="qrCodeUrl" alt="Zalo QR Code"
                                class="w-48 h-48 border-2 border-gray-300 rounded-lg bg-white" />
                            <div v-if="qrCodeExpired"
                                class="absolute inset-0 bg-black bg-opacity-70 rounded-lg flex items-center justify-center">
                                <div class="text-white font-bold text-center">
                                    {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_CODE.EXPIRED') }}
                                </div>
                            </div>
                        </div>
                        <div class="mb-4">
                            <div v-if="qrCodeTimeLeft > 0"
                                class="text-blue-600 font-semibold flex items-center justify-center gap-2">
                                <i class="icon-clock" />
                                {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_CODE.TIME_LEFT', { seconds: qrCodeTimeLeft }) }}
                            </div>
                            <div v-else class="text-red-600 font-semibold flex items-center justify-center gap-2">
                                <i class="icon-warning" />
                                {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_CODE.EXPIRED') }}
                            </div>

                            <!-- Channel Last Updated Time -->
                            <div v-if="channelLastUpdatedFormatted" class="mt-2 text-sm text-gray-500 text-center">
                                <i class="icon-calendar" />
                                {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.CHANNEL.LAST_UPDATED') }}: {{
                                    channelLastUpdatedFormatted }}
                            </div>
                        </div>
                    </div>

                    <div v-else class="text-center text-gray-600">
                        <div
                            class="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4">
                        </div>
                        <p>{{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_CODE.GENERATING') }}</p>
                    </div>
                </div>

                <div class="text-center">
                    <NextButton :is-loading="isGeneratingQR" type="button" secondary @click="generateQRCode">
                        <i class="icon-refresh" />
                        {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_CODE.REGENERATE') }}
                    </NextButton>
                </div>
            </div>

            <!-- Update Button -->
            <div class="pt-4">
                <NextButton :is-loading="isUpdating" type="button" solid blue
                    :label="$t('INBOX_MGMT.SETTINGS_POPUP.UPDATE')" @click="updateSettings" />
            </div>
        </SettingsSection>
    </div>
</template>
