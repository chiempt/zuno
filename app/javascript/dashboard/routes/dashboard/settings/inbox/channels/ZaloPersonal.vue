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
            userAgent: navigator.userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
            proxy: '',
            qrCode: '',
            qrCodeExpiresAt: null,
            qrCodeTimer: null,
            isGeneratingQR: false,
            cookie: [],
            cookieExpiresAt: null,
            cookieTimer: null,
            isGeneratingCookie: false,
            zaloServiceUrl: 'http://localhost:3001/zalo', // Use proxy to avoid CORS
            pollingInterval: null,
            isPollingQR: false,
            zaloAccountName: '',
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
        this.generateQRCodeFromNodeService();
    },
    beforeUnmount() {
        this.clearQRCodeTimer();
        this.stopPollingQR();
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

            // Ưu tiên Channel Name từ user input, nếu không có thì dùng Zalo Account Name
            const channelName = this.channelName?.trim() || this.zaloAccountName;

            console.log('🔍 Creating channel with data:');
            console.log('- Channel Name (user input):', this.channelName);
            console.log('- Channel Name (final):', channelName);
            console.log('- Zalo Account Name:', this.zaloAccountName);
            console.log('- Cookie:', this.cookie);
            console.log('- Cookie type:', typeof this.cookie);
            console.log('- Cookie length:', this.cookie?.length);
            console.log('- IMEI:', this.imei);
            console.log('- User Agent:', this.userAgent);
            console.log('- Proxy:', this.proxy);
            console.log('- QR Code:', this.qrCode ? 'Present' : 'Missing');

            // Validate cookie before creating channel
            if (!this.cookie || this.cookie.length === 0) {
                this.showAlert('Please connect your Zalo account first by scanning the QR code.');
                return;
            }

            try {
                const zaloChannel = await this.$store.dispatch(
                    'inboxes/createChannel',
                    {
                        name: channelName,
                        channel: {
                            type: 'zalo_personal',
                            name: channelName,
                            zalo_account_name: this.zaloAccountName || channelName,
                            cookie: this.cookie,
                            imei: this.imei?.trim(),
                            user_agent: this.userAgent?.trim(),
                            proxy: this.proxy?.trim(),
                            qr_code: this.qrCode?.trim(),
                        },
                    }
                );
                router.replace({
                    name: 'settings_inboxes_add_agents',
                    params: {
                        page: 'new',
                        inbox_id: zaloChannel.id,
                    },
                });
            } catch (error) {
                this.showAlert(
                    error?.response?.data?.message ||
                    this.$t('INBOX_MGMT.ADD.ZALO_PERSONAL.ERROR_MESSAGE')
                );
            }
        },

        async generateQRCodeFromNodeService() {
            if (this.isGeneratingQR) return;

            this.isGeneratingQR = true;
            this.isPollingQR = true;

            const self = this;

            try {
                console.log('🚀 Starting QR generation from Node.js service...');

                // Bước 1: Gọi POST để sinh QR code
                // Run QR code generation and polling concurrently, but still await the POST to get data
                const [generateResponse] = await Promise.all([
                    self.makeRequest(`${self.zaloServiceUrl}/qr-code`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }),
                    self.startPollingQR(),
                ]);

                console.log('📡 Generate response status:', generateResponse.status);
                console.log('📡 Generate response headers:', generateResponse.headers);

                if (!generateResponse.ok) {
                    const errorText = await generateResponse.text();
                    console.error('❌ Generate response error:', errorText);
                    throw new Error(`Failed to generate QR code: ${generateResponse.status} ${generateResponse.statusText}`);
                }

                const generateData = await generateResponse.json();
                this.cookie = generateData.credentials.cookie || [];
                this.zaloAccountName = generateData.accountName || 'Zalo Account';

            } catch (error) {
                console.error('❌ Error generating QR code:', error);

                let errorMessage = 'Failed to connect to Zalo service';
                if (error.message.includes('CORS')) {
                    errorMessage = 'CORS error: Please check if Node.js service is running on port 3001';
                } else if (error.message.includes('fetch')) {
                    errorMessage = 'Network error: Cannot connect to Zalo service';
                } else {
                    errorMessage = error.message || this.$t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_GENERATION_ERROR');
                }

                this.isGeneratingQR = false;
                this.isPollingQR = false;
            }
        },

        async startPollingQR() {
            const pollQR = async () => {
                try {
                    // Check QR code image
                    const qrResponse = await this.makeRequest(`${this.zaloServiceUrl}/qr-code`, {
                        method: 'GET',
                    });

                    if (qrResponse.ok) {
                        const qrData = await qrResponse.json();
                        console.log('📱 QR polling response:', qrData);

                        if (qrData.success && qrData.data) {
                            // Có QR code image
                            this.qrCode = qrData.data;
                            this.qrCodeExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
                            this.isGeneratingQR = false;
                            this.startQRCodeTimer();
                        }
                    }

                    // Check login status
                    const loginSuccess = await this.checkLoginStatus();
                    if (loginSuccess) {
                        this.stopPollingQR();
                        return;
                    }

                    // Nếu chưa login thành công, tiếp tục polling
                    if (this.isPollingQR) {
                        setTimeout(pollQR, 3000); // Poll mỗi 3 giây
                    }
                } catch (error) {
                    console.error('❌ Error polling QR code:', error);
                    if (this.isPollingQR) {
                        setTimeout(pollQR, 5000); // Retry sau 5 giây nếu có lỗi
                    }
                }
            };

            // Bắt đầu polling ngay lập tức
            pollQR();
        },

        stopPollingQR() {
            this.isPollingQR = false;
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
            }
        },

        async generateQRCode() {
            // Wrapper method để regenerate QR code
            this.stopPollingQR();
            this.clearQRCodeTimer();
            this.qrCode = '';
            this.cookie = [];
            this.zaloAccountName = '';
            await this.generateQRCodeFromNodeService();
        },

        async checkLoginStatus() {
            try {
                const response = await this.makeRequest(`${this.zaloServiceUrl}/status`, {
                    method: 'GET',
                });

                if (!response.ok) {
                    console.log('🔍 Status check response not ok:', response.status);
                    return false;
                }

                const data = await response.json();
                console.log('🔍 Login status:', data);

                if (data.success && data.credentials) {
                    // Debug cookie mapping
                    console.log('🔍 Debug cookie mapping:');
                    console.log('- data.credentials:', data.credentials);
                    console.log('- data.credentials.cookie:', data.credentials.cookie);
                    console.log('- typeof data.credentials:', typeof data.credentials);
                    console.log('- Array.isArray(data.credentials):', Array.isArray(data.credentials));

                    // Đã login thành công, lấy đầy đủ thông tin
                    this.cookie = data.credentials.cookie || data.credentials || [];
                    this.imei = data.credentials.imei || this.imei;
                    this.userAgent = data.credentials.userAgent || this.userAgent;
                    this.zaloAccountName = data.accountName || 'Zalo Account';

                    console.log('✅ Zalo connection successful:');
                    console.log('- Account Name:', this.zaloAccountName);
                    console.log('- Device IMEI:', this.imei);
                    console.log('- User Agent:', this.userAgent);
                    console.log('- Cookies:', this.cookie);

                    // Stop polling và clear QR
                    this.stopPollingQR();
                    this.clearQRCodeTimer();
                    this.qrCode = '';

                    this.showAlert('Zalo account connected successfully!');
                    return true;
                }

                return false;
            } catch (error) {
                console.error('❌ Error checking login status:', error);
                return false;
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

        truncateText(text, maxLength = 50) {
            if (!text) return '';
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        },

        async makeRequest(url, options = {}) {
            // Create fetch WITHOUT credentials to avoid CORS issues
            const defaultOptions = {
                mode: 'cors',
                credentials: 'omit', // Don't include credentials
                referrerPolicy: 'strict-origin-when-cross-origin',
                headers: {
                    'Accept': 'application/json',
                    'Origin': window.location.origin,
                    ...options.headers,
                },
            };

            const finalOptions = { ...defaultOptions, ...options };

            try {
                const response = await fetch(url, finalOptions);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Response error:', errorText);
                    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
                }

                return response;
            } catch (error) {
                console.error('❌ Request error:', error);
                console.error('❌ Error type:', error.name);
                console.error('❌ Error message:', error.message);
                throw error;
            }
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

                    <!-- Connection Status -->

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

                        <div v-else-if="!zaloAccountName" class="qr-loading">
                            <div class="spinner" />
                            <p>{{ isPollingQR ? 'Waiting for QR scan...' :
                                $t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_CODE.GENERATING') }}</p>
                        </div>

                        <div v-else class="qr-connected">
                            <div class="connected-icon">
                                <i class="icon-check-circle" />
                            </div>
                            <p>Zalo account connected successfully!</p>
                        </div>
                    </div>

                    <div class="qr-actions mt-4">
                        <NextButton v-if="!zaloAccountName" :is-loading="isGeneratingQR" type="button" secondary
                            @click="generateQRCode">
                            <i class="icon-refresh" />
                            {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_CODE.REGENERATE') }}
                        </NextButton>
                        <NextButton v-else :is-loading="isGeneratingQR" type="button" secondary @click="generateQRCode">
                            <i class="icon-refresh" />
                            Reconnect Account
                        </NextButton>
                    </div>
                </div>
            </div>

            <!-- Cookie Profile -->
            <div class="flex-shrink-0 flex-grow-0">
                <label>
                    Cookie Profile
                    <textarea v-model="cookieProfile" readonly class="flex-1" type="text"
                        placeholder="Auto generated cookie profile" />
                </label>
            </div>

            <!-- Channel Information Summary -->
            <div v-if="cookie.length > 0" class="w-full mt-6 p-4 bg-gray-50 rounded-lg border">
                <h3 class="text-lg font-semibold mb-3 text-gray-800">📋 Channel Information Summary</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div class="space-y-2">
                        <div>
                            <strong class="text-gray-700">Channel Name:</strong><br>
                            <span class="text-gray-600">{{ zaloAccountName || channelName || 'N/A' }}</span>
                        </div>
                        <div>
                            <strong class="text-gray-700">Device IMEI:</strong><br>
                            <span class="text-gray-600">{{ imei || 'N/A' }}</span>
                        </div>
                        <div>
                            <strong class="text-gray-700">User Agent:</strong><br>
                            <span class="text-gray-600 text-xs break-all">{{ truncateText(userAgent, 60) }}</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <div>
                            <strong class="text-gray-700">Proxy Server:</strong><br>
                            <span class="text-gray-600">{{ proxy || 'None' }}</span>
                        </div>
                        <div>
                            <strong class="text-gray-700">Credentials Status:</strong><br>
                            <span class="text-green-600">✅ Connected</span>
                        </div>
                        <div>
                            <strong class="text-gray-700">QR Code:</strong><br>
                            <span class="text-green-600">✅ Generated</span>
                        </div>
                    </div>
                </div>
                <div class="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                    <p class="text-sm text-blue-700">
                        <strong>ℹ️ Ready to Create:</strong> All information will be saved and the automatic message
                        flow will work as configured.
                    </p>
                </div>
            </div>

            <!-- Submit Button -->
            <div class="w-full mt-6">
                <NextButton :is-loading="uiFlags.isCreating" type="submit" solid blue :disabled="cookie.length === 0"
                    :label="cookie.length > 0 ? $t('INBOX_MGMT.ADD.ZALO_PERSONAL.SUBMIT_BUTTON') : 'Please connect Zalo first'" />
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

.connection-status {
    padding: 1rem;
    border-radius: 8px;
    background: #f8f9fa;
    border: 1px solid #e1e5e9;
}

.status-success {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #28a745;
    font-weight: 600;
}

.status-success i {
    font-size: 1.2rem;
}

.qr-connected {
    text-align: center;
    color: #28a745;
}

.connected-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.connected-icon i {
    color: #28a745;
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