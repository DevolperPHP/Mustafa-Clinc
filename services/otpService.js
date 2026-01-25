/**
 * OTP Service - Phone Verification using Arqam OTP API
 * API Documentation: https://otp.arqam.tech/
 */

const OTP_API_URL = 'https://otp.arqam.tech/api/sms/otp'
// const OTP_API_KEY = 'otplive_OxABmqJqR9Je1yzsN62ljNRDFznP9PmA'
const OTP_API_KEY = 'otplive_yad5xgSSIy853ZnLUDFk2Z2cteAM78uk'

// OTP Configuration
const OTP_CONFIG = {
    expiryMinutes: 5,      // OTP expires after 5 minutes
    maxAttempts: 3,        // Maximum verification attempts
    codeLength: 6,         // OTP code length
    resendCooldown: 60     // Seconds before resend is allowed
}

/**
 * Generate a random OTP code
 * @returns {string} 6-digit OTP code
 */
function generateOTPCode() {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Format phone number to international format
 * Handles Iraqi phone numbers (07xxxxxxxx → +9647xxxxxxxx)
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phone) {
    // Remove spaces, dashes, and other characters
    let cleaned = phone.replace(/[\s\-\(\)]/g, '')
    
    // If starts with 07 (Iraqi mobile), convert to +964
    if (cleaned.startsWith('07')) {
        cleaned = '+964' + cleaned.substring(1)
    }
    // If starts with 7 (without leading 0), add +964
    else if (cleaned.startsWith('7') && cleaned.length === 10) {
        cleaned = '+964' + cleaned
    }
    // If starts with 964 (without +), add +
    else if (cleaned.startsWith('964')) {
        cleaned = '+' + cleaned
    }
    // If doesn't start with +, assume it needs +964
    else if (!cleaned.startsWith('+')) {
        cleaned = '+964' + cleaned
    }
    
    return cleaned
}

/**
 * Send OTP to phone number
 * @param {string} phoneNumber - Phone number to send OTP to
 * @param {string} [customCode] - Optional custom OTP code
 * @returns {Promise<{success: boolean, code?: string, messageId?: string, error?: string}>}
 */
async function sendOTP(phoneNumber, customCode = null) {
    try {
        const formattedPhone = formatPhoneNumber(phoneNumber)
        const otpCode = customCode || generateOTPCode()
        
        const response = await fetch(OTP_API_URL, {
            method: 'POST',
            headers: {
                'X-API-Key': OTP_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phoneNumber: formattedPhone,
                otpCode: otpCode
            })
        })
        
        const data = await response.json()
        
        if (data.success || response.ok) {
            return {
                success: true,
                code: otpCode,
                messageId: data.messageId,
                expiresAt: new Date(Date.now() + OTP_CONFIG.expiryMinutes * 60 * 1000)
            }
        } else {
            console.error('OTP API Error:', data)
            return {
                success: false,
                error: data.message || 'فشل في إرسال رمز التحقق'
            }
        }
    } catch (error) {
        console.error('OTP Service Error:', error)
        return {
            success: false,
            error: 'خطأ في خدمة إرسال الرسائل'
        }
    }
}

/**
 * Verify OTP code
 * @param {string} inputCode - Code entered by user
 * @param {string} storedCode - Code stored in database
 * @param {Date} expiryDate - Expiry date of the OTP
 * @param {number} attempts - Current number of attempts
 * @returns {{valid: boolean, error?: string, expired?: boolean, maxAttemptsReached?: boolean}}
 */
function verifyOTP(inputCode, storedCode, expiryDate, attempts = 0) {
    // Check if max attempts reached
    if (attempts >= OTP_CONFIG.maxAttempts) {
        return {
            valid: false,
            error: 'تم تجاوز الحد الأقصى من المحاولات',
            maxAttemptsReached: true
        }
    }
    
    // Check if OTP has expired
    if (new Date() > new Date(expiryDate)) {
        return {
            valid: false,
            error: 'انتهت صلاحية رمز التحقق',
            expired: true
        }
    }
    
    // Verify the code
    if (inputCode === storedCode) {
        return { valid: true }
    }
    
    return {
        valid: false,
        error: 'رمز التحقق غير صحيح'
    }
}

/**
 * Check if resend is allowed based on cooldown
 * @param {Date} lastSentAt - Time when last OTP was sent
 * @returns {{allowed: boolean, remainingSeconds?: number}}
 */
function canResendOTP(lastSentAt) {
    if (!lastSentAt) return { allowed: true }
    
    const elapsed = Math.floor((Date.now() - new Date(lastSentAt).getTime()) / 1000)
    const remaining = OTP_CONFIG.resendCooldown - elapsed
    
    if (remaining <= 0) {
        return { allowed: true }
    }
    
    return {
        allowed: false,
        remainingSeconds: remaining
    }
}

module.exports = {
    sendOTP,
    verifyOTP,
    canResendOTP,
    generateOTPCode,
    formatPhoneNumber,
    OTP_CONFIG
}
