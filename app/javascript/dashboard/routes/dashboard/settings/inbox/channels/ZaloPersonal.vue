<script>
import { mapGetters } from 'vuex';
import { useVuelidate } from '@vuelidate/core';
import { useAlert } from 'dashboard/composables';
import { required } from '@vuelidate/validators';
import router from '../../../../index';
import PageHeader from '../../SettingsSubPageHeader.vue';
import NextButton from 'dashboard/components-next/button/Button.vue';

export default {
    components: {
        PageHeader,
        NextButton,
    },
    setup() {
        return { v$: useVuelidate() };
    },
    data() {
        return {
            channelName: '',
            imei: '',
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
            proxy: '',
            qrCode: '',
            qrCodeExpiresAt: null,
            qrCodeTimer: null,
            isGeneratingQR: false,
            cookie: [
                {
                    "key": "_zlang",
                    "value": "vn",
                    "domain": "zalo.me",
                    "path": "/",
                    "hostOnly": false,
                    "creation": "2025-07-18T10:03:46.707Z",
                    "lastAccessed": "2025-07-18T10:03:47.044Z"
                },
                {
                    "key": "zpsid",
                    "value": "50pP.440708225.4.CMmYfvHgoI0Lneqwc6h98E4PknIWMluGh5Zx5KgMqQLC5PnPbMhLMlngoI0",
                    "maxAge": 31536000,
                    "domain": "zalo.me",
                    "path": "/",
                    "secure": true,
                    "httpOnly": true,
                    "hostOnly": false,
                    "creation": "2025-07-18T10:03:46.707Z",
                    "lastAccessed": "2025-07-18T10:03:47.044Z",
                    "sameSite": "none"
                },
                {
                    "key": "zpw_sek",
                    "value": "68y-.440708225.a0.lK142RhMvu0xUgEQczRdWC7qWkkOxCMhxPEinkwcfkJqjQ_CrfxH-VFWaA_xwzgYnmWRc3yEcDN3r-MSmBxdW0",
                    "maxAge": 604800,
                    "domain": "chat.zalo.me",
                    "path": "/",
                    "secure": true,
                    "httpOnly": true,
                    "hostOnly": false,
                    "creation": "2025-07-18T10:03:46.708Z",
                    "lastAccessed": "2025-07-18T10:03:47.044Z",
                    "sameSite": "lax"
                },
                {
                    "key": "app.event.zalo.me",
                    "value": "4414415304169739210",
                    "domain": "zalo.me",
                    "path": "/",
                    "hostOnly": false,
                    "creation": "2025-07-18T10:03:46.965Z",
                    "lastAccessed": "2025-07-18T10:03:47.044Z"
                }
            ],
            cookieExpiresAt: null,
            cookieTimer: null,
            isGeneratingCookie: false,
        };
    },
    computed: {
        ...mapGetters({
            uiFlags: 'inboxes/getUIFlags',
        }),
        qrCodeUrl() {
            return this.qrCode ? `data:image/png;base64,${this.qrCode}` : null;
        },
        qrCodeTimeLeft() {
            if (!this.qrCodeExpiresAt) return 0;
            const now = new Date().getTime();
            const expires = new Date(this.qrCodeExpiresAt).getTime();
            return Math.max(0, Math.floor((expires - now) / 1000));
        },
        qrCodeExpired() {
            return this.qrCodeTimeLeft === 0;
        },
    },
    validations: {
        channelName: { required },
        imei: { required },
        userAgent: { required },
    },
    mounted() {
        this.generateIMEI();
        this.generateQRCode();
        this.startQRCodeTimer();
    },
    beforeUnmount() {
        this.clearQRCodeTimer();
    },
    methods: {
        generateIMEI() {
            // Generate a random IMEI-like number
            const imei = '35' + Math.random().toString().substr(2, 13);
            this.imei = imei;
        },

        async createChannel() {
            this.v$.$touch();
            if (this.v$.$invalid) {
                return;
            }

            try {
                const zaloChannel = await this.$store.dispatch(
                    'inboxes/createChannel',
                    {
                        name: this.channelName?.trim(),
                        channel: {
                            type: 'zalo_personal',
                            name: this.channelName?.trim(),
                            imei: this.imei?.trim(),
                            user_agent: this.userAgent?.trim(),
                            proxy: this.proxy?.trim(),
                            qr_code: this.qrCode?.trim(),
                            cookie: this.cookie,
                        },
                    }
                );

                this.showAlert(this.$t('INBOX_MGMT.ADD.ZALO_PERSONAL.SUCCESS_MESSAGE'));
                router.push({
                    name: 'settings_inboxes_page_channel_agents',
                    params: { page: 'agents' },
                });
            } catch (error) {
                this.showAlert(
                    error?.response?.data?.message ||
                    this.$t('INBOX_MGMT.ADD.ZALO_PERSONAL.ERROR_MESSAGE')
                );
            }
        },

        async generateQRCode() {
            if (this.isGeneratingQR) return;

            this.isGeneratingQR = true;
            try {
                // TODO: Implement actual QR code generation API call
                // For now, we'll simulate with a placeholder
                const response = await this.$store.dispatch('inboxes/generateZaloQRCode', {
                    imei: this.imei,
                    userAgent: this.userAgent,
                });

                this.qrCode = response.qr_code;
                this.qrCodeExpiresAt = response.expires_at;

                // Restart timer for new QR code
                this.startQRCodeTimer();
            } catch (error) {
                this.showAlert(
                    error?.response?.data?.message ||
                    this.$t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_GENERATION_ERROR')
                );
            } finally {
                this.isGeneratingQR = false;
            }
        },

        startQRCodeTimer() {
            this.clearQRCodeTimer();
            this.qrCodeTimer = setInterval(() => {
                if (this.qrCodeTimeLeft <= 0) {
                    this.clearQRCodeTimer();
                    // Auto-generate new QR code when expired
                    this.generateQRCode();
                }
            }, 1000);
        },

        clearQRCodeTimer() {
            if (this.qrCodeTimer) {
                clearInterval(this.qrCodeTimer);
                this.qrCodeTimer = null;
            }
        },

        showAlert(message) {
            const { showAlert } = useAlert();
            showAlert(message);
        },
    },
};
</script>

<template>
    <div class="h-full w-full p-6 col-span-6">
        <PageHeader :header-title="$t('INBOX_MGMT.ADD.ZALO_PERSONAL.TITLE')"
            :header-content="$t('INBOX_MGMT.ADD.ZALO_PERSONAL.DESC')" />

        <form class="flex flex-wrap flex-col mx-0" @submit.prevent="createChannel()">
            <!-- Channel Name -->
            <div class="flex-shrink-0 flex-grow-0">
                <label :class="{ error: v$.channelName.$error }">
                    {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.CHANNEL_NAME.LABEL') }}
                    <input v-model="channelName" type="text"
                        :placeholder="$t('INBOX_MGMT.ADD.ZALO_PERSONAL.CHANNEL_NAME.PLACEHOLDER')"
                        @blur="v$.channelName.$touch" />
                    <span v-if="v$.channelName.$error" class="message">
                        {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.CHANNEL_NAME.ERROR') }}
                    </span>
                </label>
            </div>

            <!-- IMEI -->
            <div class="flex-shrink-0 flex-grow-0">
                <label :class="{ error: v$.imei.$error }">
                    {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.IMEI.LABEL') }}
                    <div class="flex items-center gap-2">
                        <input v-model="imei" type="text"
                            :placeholder="$t('INBOX_MGMT.ADD.ZALO_PERSONAL.IMEI.PLACEHOLDER')" readonly class="flex-1"
                            @blur="v$.imei.$touch" />
                        <button type="button" class="button secondary small" @click="generateIMEI">
                            <i class="icon-refresh" />
                            {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.IMEI.REGENERATE') }}
                        </button>
                    </div>
                    <span v-if="v$.imei.$error" class="message">
                        {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.IMEI.ERROR') }}
                    </span>
                </label>
            </div>

            <!-- User Agent -->
            <div class="flex-shrink-0 flex-grow-0">
                <label :class="{ error: v$.userAgent.$error }">
                    {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.USER_AGENT.LABEL') }}
                    <input v-model="userAgent" type="text"
                        :placeholder="$t('INBOX_MGMT.ADD.ZALO_PERSONAL.USER_AGENT.PLACEHOLDER')"
                        @blur="v$.userAgent.$touch" />
                    <span v-if="v$.userAgent.$error" class="message">
                        {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.USER_AGENT.ERROR') }}
                    </span>
                </label>
            </div>

            <!-- Proxy -->
            <div class="flex-shrink-0 flex-grow-0">
                <label>
                    {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.PROXY.LABEL') }}
                    <input v-model="proxy" type="text"
                        :placeholder="$t('INBOX_MGMT.ADD.ZALO_PERSONAL.PROXY.PLACEHOLDER')" />
                    <span class="help-text">
                        {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.PROXY.HELP_TEXT') }}
                    </span>
                </label>
            </div>

            <!-- QR Code Section -->
            <div class="flex-shrink-0 flex-grow-0 mt-4">
                <div class="qr-code-section">
                    <h4 class="text-lg font-semibold mb-2">
                        {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_CODE.TITLE') }}
                    </h4>
                    <p class="text-sm text-gray-600 mb-4">
                        {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_CODE.DESCRIPTION') }}
                    </p>

                    <div class="qr-code-container">
                        <div v-if="qrCodeUrl && !isGeneratingQR" class="qr-code-display">
                            <div class="qr-image-wrapper">
                                <img :src="qrCodeUrl" alt="Zalo QR Code" class="qr-image" />
                                <div class="qr-overlay" v-if="qrCodeExpired">
                                    <div class="qr-expired-text">
                                        {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_CODE.EXPIRED') }}
                                    </div>
                                </div>
                            </div>
                            <div class="qr-timer">
                                <div v-if="qrCodeTimeLeft > 0" class="timer-active">
                                    <i class="icon-clock" />
                                    {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_CODE.TIME_LEFT', { seconds: qrCodeTimeLeft })
                                    }}
                                </div>
                                <div v-else class="timer-expired">
                                    <i class="icon-warning" />
                                    {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_CODE.EXPIRED') }}
                                </div>
                            </div>
                        </div>

                        <div v-else class="qr-loading">
                            <div class="spinner" />
                            <p>{{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_CODE.GENERATING') }}</p>
                        </div>
                    </div>

                    <div class="qr-actions mt-4">
                        <NextButton :is-loading="isGeneratingQR" type="button" secondary @click="generateQRCode">
                            <i class="icon-refresh" />
                            {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_CODE.REGENERATE') }}
                        </NextButton>
                    </div>
                </div>
            </div>

            <!-- Submit Button -->
            <div class="w-full mt-6">
                <NextButton :is-loading="uiFlags.isCreating" type="submit" solid blue
                    :label="$t('INBOX_MGMT.ADD.ZALO_PERSONAL.SUBMIT_BUTTON')" />
            </div>
        </form>
    </div>
</template>

<style scoped>
.qr-code-section {
    border: 1px solid #e1e5e9;
    border-radius: 8px;
    padding: 1.5rem;
    background: #f8f9fa;
}

.qr-code-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
}

.qr-code-display {
    text-align: center;
}

.qr-image-wrapper {
    position: relative;
    display: inline-block;
    margin-bottom: 1rem;
}

.qr-image {
    width: 200px;
    height: 200px;
    border: 2px solid #e1e5e9;
    border-radius: 8px;
    background: white;
}

.qr-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.qr-expired-text {
    color: white;
    font-weight: bold;
    text-align: center;
}

.qr-timer {
    margin-top: 1rem;
}

.timer-active {
    color: #007bff;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.timer-expired {
    color: #dc3545;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.qr-loading {
    text-align: center;
    color: #666;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

.qr-actions {
    text-align: center;
}

.flex {
    display: flex;
}

.items-center {
    align-items: center;
}

.gap-2 {
    gap: 0.5rem;
}

.flex-1 {
    flex: 1;
}

.mt-4 {
    margin-top: 1rem;
}

.mt-6 {
    margin-top: 1.5rem;
}

.mb-2 {
    margin-bottom: 0.5rem;
}

.mb-4 {
    margin-bottom: 1rem;
}

.text-lg {
    font-size: 1.125rem;
}

.font-semibold {
    font-weight: 600;
}

.text-sm {
    font-size: 0.875rem;
}

.text-gray-600 {
    color: #6b7280;
}

.button.secondary.small {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
}

.help-text {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.25rem;
    display: block;
}
</style>